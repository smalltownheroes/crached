'use strict';

class Util {

	constructor(cache) {
		this.cache = cache;
		this.fetching = {};
		this.queue = {};
	}

	getOrFetch(key, fetchPromise, calculateKey) {
		const cacheKey = calculateKey ? calculateKey(key) : key;
		const cachedItem = this.cache.get(cacheKey);
		if (cachedItem) {
			return Promise.resolve(cachedItem);
		} else {
			if (this.fetching[cacheKey]) {
				const deferred = Promise.defer();
				this.queue[cacheKey] = this.queue[cacheKey] || [];
				this.queue[cacheKey].push(deferred);
				return deferred.promise;
			} else {
				this.fetching[cacheKey] = true;
				return fetchPromise(cacheKey)
				.then(result => {
					this.cache.set(cacheKey, result);
					if (this.queue[cacheKey]) {
						while (this.queue[cacheKey].length > 0) {
							this.queue[cacheKey].shift().resolve(result);
						}
					}
					this.fetching[cacheKey] = false;
					return Promise.resolve(result);
				});
			}
		}
	}

};

module.exports = Util;