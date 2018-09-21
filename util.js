'use strict';

class Util {

	constructor(cache) {
		this.cache = cache;
		this.fetching = {};
	}

	getOrFetch(key, fetchPromise, calculateKey) {
		const cacheKey = calculateKey ? calculateKey(key) : key;
		const cachedItem = this.cache.get(cacheKey);
		if (cachedItem) {
			return Promise.resolve(cachedItem);
		}

		if (this.fetching[cacheKey]) {
			return this.fetching[cacheKey];
		}

		try {
			this.fetching[cacheKey] = fetchPromise(cacheKey);
			this.fetching[cacheKey].then(result => {
				this.cache.set(cacheKey, result);
				delete this.fetching[cacheKey];
			}).catch(err => {
				delete this.fetching[cacheKey];
			});
			return this.fetching[cacheKey];
		} catch(e) {
			// catch throws for fetchPromise
			return Promise.reject(e);
		}
	}

};

module.exports = Util;
