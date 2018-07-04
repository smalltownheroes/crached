'use strict';

const defer = () => {
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
};

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
					const deferred = defer();
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
						if (queue[key]) {
							while (queue[key].length > 0) {
								queue[key].shift().reject(err);
							}
						}
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
