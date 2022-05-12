import adze from 'adze';

export function delay<T>(cb: () => Promise<any>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    setInterval(() => {
      cb().then(resolve).catch(reject);
    }, ms);
  });
}

export const log = adze().ns('adze-transport-cloudwatch-logs').seal();
