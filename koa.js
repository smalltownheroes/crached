'use strict';

const cacheMiddelware = (ttl, shouldCache, calculateKey) => {
	const cache = {};
	const fetching = {};
	const queue = {};
	return function* (next) {
		const enabled = yield shouldCache(this);
		if (enabled) {
			const key = calculateKey ? calculateKey(this) : `${this.request.path}?${this.request.querystring}`;
			if (cache[key]) {
				this.response.body = cache[key];
			} else {
				if (fetching[key]) {
					const deferred = Promise.defer();
					queue[key] = queue[key] || [];
					queue[key].push(deferred);
					this.response.body = yield deferred.promise;
				} else {
					try {
						fetching[key] = true;
						yield next;
						if (this.response.status === 200) {
							cache[key] = this.response.body;
							if (queue[key]) {
								while (queue[key].length > 0) {
									queue[key].shift().resolve(cache[key]);
								}
							}
							setTimeout(() => {
								delete cache[key];
							}, (parseInt(ttl, 10) * 1000));
						}
						fetching[key] = false;
					} catch (err) {
						fetching[key] = false;
						throw err;
					}
				}
			}
		} else {
			yield next;
		}
	}
}

module.exports = cacheMiddelware;
