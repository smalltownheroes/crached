'use strict';

class Util {

	constructor(cache) {
		this.cache = cache;
		this.fetching = {};
		this.queue = {};
	}

	defer() {
		if (typeof Promise !== 'undefined' && Promise.defer) {
			return Promise.defer();
		} else {
			const deferred = {};
			deferred.promise = new Promise((resolve, reject) => {
				deferred.resolve = resolve;
				deferred.reject = reject;
			});
			return deferred;
		}
	}

	getOrFetch(key, fetchPromise, calculateKey) {
		const cacheKey = calculateKey ? calculateKey(key) : key;
		const cachedItem = this.cache.get(cacheKey);
		if (cachedItem) {
			return Promise.resolve(cachedItem);
		} else {
			if (this.fetching[cacheKey]) {
				const deferred = this.defer();
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
				}).catch(err => {
					if (this.queue[cacheKey]) {
						while (this.queue[cacheKey].length > 0) {
							this.queue[cacheKey].shift().reject(err);
						}
					}
					this.fetching[cacheKey] = false;
					throw err;
				});
			}
		}
	}

};

module.exports = Util;
