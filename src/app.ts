import createError from 'http-errors';

import express, { RequestHandler, ErrorRequestHandler  } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';

import indexRouter from './routes/index';
import usersRouter from './routes/users';
import { Knex } from "knex";
import { createDatabase } from "./utils";
import { ModelContext, modelManager } from './manager/modelManager';
import { ControllerContext, controllerManager } from './manager/controllerManager';
import { mountProductRouter } from './routes/product';
import { mountOrderRouter } from './routes/order';

class App {
  public app: express.Application;
  private knexSql: Knex;
  private modelCtx: ModelContext;
  private controllerCtx: ControllerContext;

  constructor() {
    this.app = express();
    this.config();
    this.knexSql = createDatabase();

    // If using mySQL 8.0, we have to change the way of storing the password in my SQL
    // See https://github.com/strapi/strapi/issues/13774 or 
    // https://stackoverflow.com/questions/50093144/mysql-8-0-client-does-not-support-authentication-protocol-requested-by-server
    // Remark: From the query SELECT users, host from  mysql.user, we should change the users with host %
    // , not just at localhost 
    // So, the correct scripts to change this issue:
    // ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY 'yourpassword';
    // FLUSH PRIVILEGES;
    // this.knexSql
    //   .select()
    //   .from("products")
    //   .then( (result) => {
    //     console.log(result);
    //   });

    this.modelCtx = modelManager({ knexSql : this.knexSql });
    this.controllerCtx = controllerManager({ 
      knexSql: this.knexSql, 
      modelCtx: this.modelCtx 
    });
    
    this.routerSetup();
    this.errorHandler();
  }

  private config() {
    // view engine setup
    this.app.set('views', path.join(__dirname, 'views'));
    this.app.set('view engine', 'ejs');

    this.app.use(logger('dev'));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: false }));
    this.app.use(cookieParser());
    this.app.use(express.static(path.join(__dirname, 'public')));
  }

  private routerSetup() {
    this.app.use('/', indexRouter);
    this.app.use('/users', usersRouter);
    this.app.use('/products', mountProductRouter({ controllerCtx: this.controllerCtx}));
    this.app.use('/orders', mountOrderRouter({ controllerCtx: this.controllerCtx }));
  }

  private errorHandler() {
    // catch 404 and forward to error handler
    const requestHandler: RequestHandler = function (_req, _res, next) {
      next(createError(404));
    };
    this.app.use(requestHandler);

    // error handler
    const errorRequestHandler: ErrorRequestHandler = function (
      err,
      req,
      res,
      _next
    ) {
      // set locals, only providing error in development
      res.locals.message = err.message;
      res.locals.error = req.app.get("env") === "development" ? err : {};

      // render the error page
      res.status(err.status || 500);
      res.render("error");
    };
    this.app.use(errorRequestHandler);
  }
}

export default new App().app;

