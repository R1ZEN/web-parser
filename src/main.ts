import { Server } from 'http';
import { onlinerRentStrategy } from './strategy/onliner/onlinerRentStrategy';
import { withLogger } from './logger/withLogger';
import { initDatabase } from './database/mongodb';
import { metroDatasetStrategy } from './strategy/metro/metroDatasetStrategy';
import { transportDatasetStrategy } from './strategy/transport/transportDatasetStrategy';
import { startCronJob } from './cronJob';

// Server for heroku
new Server().listen(process.env.PORT);

export const main = withLogger(
  async function main() {
    let db = await initDatabase();
  
    let context = {
      db: db.instance,
    }
  
    // Initialize
    await Promise.all([
      onlinerRentStrategy({...context, colName: 'onliner'}),
      metroDatasetStrategy({...context, colName: 'metro'}),
      transportDatasetStrategy({...context, colName: 'transport'}),
    ]);
  
    startCronJob(() => onlinerRentStrategy({...context, colName: 'onliner'}));
  }
);
