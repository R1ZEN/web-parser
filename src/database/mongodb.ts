
import { MongoClient, Db, MongoError } from "mongodb";
import { compose } from '../compose';


export const initDatabase = compose(
  async function connect(): Promise<{instance: Db, disconnect: () => Promise<any>}> {
    let {DB_URL = '', DB_NAME = ''} = process.env;

    if (process.env.NODE_ENV === "production") {
      DB_URL = DB_URL.replace('username', process.env.ATLAS_MONGODB_USER);
      DB_URL = DB_URL.replace('password', process.env.ATLAS_MONGODB_PASSWORD);
    }

    let client = new MongoClient(DB_URL, { useUnifiedTopology: true });

    await client.connect();
    let instance = client.db(DB_NAME);
    let disconnect = compose(function disconnect() {
      return client.close()
    });

    return {
      instance,
      disconnect
    };
  },
);

export const catchMongodbError = compose(
  function catchMongodbError(err: any, callback: (err: MongoError) => any) {
    if (!(err instanceof MongoError)) {
      throw err;
    }

    return callback(err);
  }
);
