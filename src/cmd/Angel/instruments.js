const cliProgress = require('cli-progress');
const { from } = require('rxjs');
const { map } = require('rxjs/operators');
const Logger = require('../../common/Logger');
const Database = require('../../common/database/Database');
const network = require('../../common/NetworkOps');
const Config = require('../../common/Config');

const TAG = 'instruments: ';

async function truncateDatabase(db) {
  const table_name = 'instruments';
  const query = `delete from ${table_name} `;
  await db.run(query);
}

async function insert(db, item) {
  const table_name = 'instruments';
  let query = `insert into ${table_name} `;
  query += '(token, symbol, name, expiry, strike, lotsize, instrumenttype, exch_seg, tick_size) ';
  query += 'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
  const {
    token, symbol, name, expiry, strike, lotsize, instrumenttype, exch_seg, tick_size,
  } = item;

  const params = [
    token, symbol,
    name, expiry,
    strike, lotsize,
    instrumenttype, exch_seg,
    tick_size,
  ];

  await db.run(query, params);
}

const dump_stocks = async () => {
  const progress = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  const db = await Database.getDatabase();
  try {
    const res = await network.makeGetRequest(Config.ANGEL_URLS.tradedStocks);
    progress.start(res.length, 0);

    await truncateDatabase(db);

    from(res).pipe(
      map((item) => from(insert(db, item))),
    ).subscribe(() => {
      progress.increment();
    });
  } catch (e) {
    console.log(e);
  }
  await Database.closeDatabase(db);
  progress.stop();
};

const commandUpdateInstruments = {
  command: 'dump_stocks',
  describe: 'Retrieve the CSV dump of all traded instruments',
  handler: (argv) => {
    dump_stocks().then(() => {
      Logger.logSuccess(TAG, 'traded instruments has been updated.');
    });
  },
};

module.exports = {
  commandUpdateInstruments,
};
