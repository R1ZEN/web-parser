import { api } from '../../request/api';
import { compose } from '../../compose';
import { Db, Collection } from 'mongodb';
import { getApartmentDescription, getApartmentOptions, getApartmentPhone } from './onlinerApartmentPage';
import { getDocument } from '../../request/document';
import { IOnlinerApartments, RentApartmentEntity } from './onlinerInterface';
import { catchMongodbError } from '../../database/mongodb';
import { IBulkWriteError } from '../../database/mongodb.typing';


interface IContext {
  db: Db,
  colName: string;
}

interface PartialApartment {
  id: number;
  url: string;
}

function getApartmentsPage(page: number): Promise<IOnlinerApartments> {
  return api.get<IOnlinerApartments>(`https://ak.api.onliner.by/search/apartments/`, {
    query: {
      'rent_type[]': '1_room',
      'price[min]': '300',
      'price[max]': '400',
      'currency': 'usd',
      'bounds[lb][lat]': '53.743025956304315',
      'bounds[lb][long]': '27.39028930664063',
      'bounds[rt][lat]': '54.05293900056246',
      'bounds[rt][long]': '27.73361206054688',
      'v': '0.8399037381514567',
      'page': page,
    }
  });
}

const EXPIRE_DAYS_IN_SECONDS = 7*24*60*60;

async function initOnlinerCollection(context: IContext): Promise<{collection: Collection}> {
  let {db, colName} = context;
  let collection: Collection;

  try {
    collection = await db.createCollection(colName, {strict: true});
    await collection.createIndex('id', {unique: true});
    await collection.createIndex('expireAt', {expireAfterSeconds: EXPIRE_DAYS_IN_SECONDS});
    await collection.createIndex({ location:'2dsphere' });
  } catch(err) {
    catchMongodbError(err, () => {
      collection = db.collection(colName);
    });
  }

  return {
    collection,
  }
}

async function getRentPageEntitiesSenary(context: {collection: Collection}) {
  let {collection} = context;
  let apartmentsPage = await getApartmentsPage(1);
  let pages = apartmentsPage.page.last;
  let entities: RentApartmentEntity[] = [];
  let idsMap: Record<string, {id: number, duplicated: boolean, url: string}> = {};
  for (let i = 0; i < pages; i++) {
    apartmentsPage.apartments.forEach((apartment) => {
      idsMap[String(apartment.id)] = {
        id: apartment.id,
        duplicated: false,
        url: apartment.url,
      };

      entities.push({
        id: apartment.id,
        price: apartment.price,
        expireAt: new Date(Date.now() + EXPIRE_DAYS_IN_SECONDS * 10000),
        address: apartment.location.user_address,
        location: {
          type: 'Point',
          coordinates: [
            apartment.location.longitude,
            apartment.location.latitude
          ],
        },
        photo: apartment.photo,
        contact: apartment.contact,
        url: apartment.url,
      });
    });

    apartmentsPage = await getApartmentsPage(apartmentsPage.page.current + 1);
  }

  try {
    await collection.insertMany(entities, {ordered: false});
  } catch (err) {
    catchMongodbError(err, (err: IBulkWriteError) => {
      err.writeErrors.map((entity) => {
        idsMap[String(entity.err.op.id)].duplicated = true;
      });
    });
  }

  let data = Object.keys(idsMap).reduce((acc, id) => {
    if (!idsMap[id].duplicated) {
      acc.push({id: idsMap[id].id, url: idsMap[id].url});
    }

    return acc;
  }, [])

  return {
    collection,
    data,
  };
};


async function updateApartmentEntitySenary(context: {collection: Collection, data: PartialApartment[]}) {
  let {collection, data} = context;
  let length = data.length;

  if (!length) {
    return;
  }

  let bulk = collection.initializeUnorderedBulkOp();
  for(let i = 0; i < length; i++) {
    let {id, url} = data[i];

    let document = await getDocument(url);
    let [
      options,
      phone,
      description,
    ] = await Promise.all([
      getApartmentOptions(document),
      getApartmentPhone(document),
      getApartmentDescription(document),
    ]);

    bulk.find({id}).update({$set: {options, phone, description}});
  }

  await bulk.execute();
}

export const onlinerRentStrategy = compose(
  initOnlinerCollection,
  getRentPageEntitiesSenary,
  updateApartmentEntitySenary,
);
