import redis from "redis";

export default class RedisClient {
  client: redis.RedisClient;

  getAsync = async (key: string): Promise<any> =>
    new Promise((resolve, reject) => {
      this.client.get(key, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });

  constructor(client: redis.RedisClient) {
    this.client = client;
  }
}
