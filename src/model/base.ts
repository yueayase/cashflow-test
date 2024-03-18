import { Knex } from "knex";
import { isEmpty, mapValues, mapKeys, camelCase, snakeCase } from "lodash";
import { isJson } from "../utils";

// T 在這個階段，先不給他真正的型別 ; 而是等到其他繼承他的 class 要用的時候再傳入型別
// database transaction, 資料庫交易 => 保證多筆的資料庫操作，能一起完成 或是一起失敗
// eg: select找出一筆訂單，update 將錢轉出，create 創建 log， select找出更新後的訂單...
export interface IBase<T> {
    findAll(trx?: Knex.Transaction): Promise<T[] | null>;
    findOne(id: any, trx?: Knex.Transaction): Promise<T | null>;
    create(data: Omit<T,'id'>, trx?: Knex.Transaction): Promise<T | null>;
    update(
        id: any, 
        data: Partial<Omit<T, 'id'>>, 
        trx?: Knex.Transaction
    ): Promise<T | null>;
    delete(id: any, trx?: Knex.Transaction): Promise<void>;
}

export abstract class Base<T> implements IBase<T> {
    protected knexSql: Knex;
    protected tableName: string = '';
    protected schema = {};

    constructor({ knexSql, tableName}: { knexSql: Knex, tableName?: string}){
        this.knexSql = knexSql;

        if(tableName) this.tableName = tableName;
    }

   public findAll = async (trx?: Knex.Transaction) => {
        // select col1, col2,... from tableName
        let sqlBuilder = this.knexSql(this.tableName).select(this.schema);

        if(trx) sqlBuilder = sqlBuilder.transacting(trx);

        const result = await sqlBuilder;

        if(isEmpty(result)) return null;

        return result.map(this.DBdata2DBObject) as T[];
    }

   public findOne = async (id: any, trx?: Knex.Transaction) => {
        let sqlBuilder = this.knexSql(this.tableName).select(this.schema).where({ id });

        if(trx) sqlBuilder = sqlBuilder.transacting(trx);

        const result = await sqlBuilder;

        if(isEmpty(result)) return null;

        return this.DBdata2DBObject(result[0]) as T;
    }

  public create = async (data: Omit<T,'id'>, trx?: Knex.Transaction) => {
        let sqlBuilder = this.knexSql(this.tableName).insert(this.DBObject2DBdata(data));

        if(trx) sqlBuilder = sqlBuilder.transacting(trx);

        const result = await sqlBuilder;

        if(isEmpty(result)) return null;

        const id = result[0];
        return await this.findOne(id, trx);
    }

  public update = async (id: any, data: Partial<Omit<T, 'id'>>, trx?: Knex.Transaction) => {
        let sqlBuilder = this.knexSql(this.tableName).update(this.DBObject2DBdata(data)).where({id});

        if(trx) sqlBuilder = sqlBuilder.transacting(trx);

        await sqlBuilder;

        return await this.findOne(id, trx);
    }
  public delete = async (id: any, trx?: Knex.Transaction) => {
        let sqlBuilder = this.knexSql(this.tableName).where(id).del();

        if(trx) sqlBuilder = sqlBuilder.transacting(trx);

        await sqlBuilder;

        return;
    }

    protected DBdata2DBObject = (data: any) => {
         const transform = mapValues(data, (value, key) => {
            if(['updatedAt', 'createdAt'].includes(key)) return new Date(value);

            if(isJson(value)) return JSON.parse(value);

            return value;
         });

         return mapKeys(transform, (_value, key) => camelCase(key));
    }

    protected DBObject2DBdata = (data: any) => {
        const transform = mapValues(data, (value, key) => {
           if(['updatedAt', 'createdAt'].includes(key)) return new Date(value);

           // check if a string is a json
           if(typeof value === 'object') return JSON.stringify(value);

           return value;
        });

        return mapKeys(transform, (_value, key) => snakeCase(key));
   }
}