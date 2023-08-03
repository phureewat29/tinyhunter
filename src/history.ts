import { initMevShare } from './lib/client';

const main = async () => {
  const { mevShare } = await initMevShare();
  const info = await mevShare.getEventHistoryInfo();

  let i = 0;
  let done = false;
  while (!done) {
    const resHistory = await mevShare.getEventHistory({
      limit: info.maxLimit,
      offset: i * info.maxLimit,
      blockStart: info.minBlock,
    });
    for (const event of resHistory) {
      if (event.hint.txs) {
        console.log('event', event);
        console.log('txs', event.hint.txs);
        break;
      }
    }
    for (const event of resHistory) {
      if (event.hint.logs) {
        console.log('logs', event.hint.logs);
        done = true;
        break;
      }
    }
    i++;
  }
};

main();
