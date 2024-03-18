import { Knex, knex } from "knex";
// Beware: https://stackoverflow.com/questions/70415423/cant-import-installed-uuid-npm-package
import { uuid } from 'uuidv4';

enum ISOLATION_LEVEL {
  READ_UNCOMMITTED = "READ UNCOMMITTED",
  READ_COMMITTED = "READ COMMITTED",
  REPEATABLE_READ = "REPEATABLE READ",
  SERIALIZABLE = "SERIALIZABLE"
}

export const createDatabase = () => {
    return knex({
        client: 'mysql',
        connection: {
          host : process.env.DATABASE_HOST || '127.0.0.1',
          port : Number(process.env.DATABASE_PORT) || 3306,
          user : process.env.DATABASE_USER || 'root',
          password : process.env.DATABASE_PASSWORD || 'mysqladmin1220',
          database : process.env.DATABASE_DATABASE || 'xue-mi'
        },
        pool: { min: 2, max: 5 }
    })
}

export const isJson = (value: string) => {
  try {
    return Boolean(JSON.parse(value));
  }
  catch (e) {
    return false;
  }
}


export const transactionHandler = async<T = any> (
  knex: Knex,
  callback: (trx: Knex.Transaction) => Promise<T>,
  options: {
    retryTimes?: number,
    maxBackOff?: number,
    isolation?: ISOLATION_LEVEL
  } = {}
) => {
  const { retryTimes = 100, maxBackOff = 1000, isolation } = options;
  let attempts = 0;
  const errorMessages = new Set();

  const execTransaction = async (): Promise<T> => {
    const trx = await knex.transaction();

    try{
      if(isolation)
        await trx.raw("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");

      const result = await callback(trx);

      await trx.commit();

      return result;
    }
    catch (err: any) {
      await trx.rollback();
      errorMessages.add(err.toString());

      // See: https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html
      if (err.code === "1205") throw err;

      if (attempts > retryTimes){
        throw new Error("[Transaction]: retry times is up to max.\n" + 
          Array.from(errorMessages).join("\n"));
      }
        

      attempts++;

      await sleep(maxBackOff);

      return execTransaction();
    }
  }

  return await execTransaction();
}

function sleep(maxBackOff: number) {
  return new Promise((resolve) => setTimeout(() => resolve(1), maxBackOff));
}

export const genUID = () => {
  // timestamp 13 + 7 = 20
  const alpha = "abcdefghij";
  const timestampStr = new Date().getTime().toString();

  const code = timestampStr.split("") // ["1", "2", "3", "4", ...]
    .map((v, idx) => idx % 2 ? v : alpha[Number(v)])
    .join("");

  const id = uuid().split("-")[0];
  return `${code}${id.substring(0, id.length - 1)}`;
}
