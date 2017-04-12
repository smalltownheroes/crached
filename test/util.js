'use strict';

const LRU   = require('lru-cache');
const async = require('async');
const _     = require('lodash');
const Util  = require('..').util;

describe('Util', () => {

	const lruCache = LRU({
		max: 10,
		maxAge: 5000,
	});

	it('tests when the cache is empty and ', (done) => {
		const util = new Util(lruCache);
		const fetchPromise = (key) => new Promise((resolve, reject) => {
			setTimeout(() => {
				resolve({ key: key, some: 'thing' });
			}, Math.floor((Math.random() * 100) + 1));
		});
		const work = [];
		for (let i of _.range(0, 100)) {
			work.push((cb) => {
				setTimeout(() => {
					const randomKey = Math.floor((Math.random() * 5) + 1);
					util.getOrFetch(randomKey, fetchPromise)
					.then(result => {
						cb(null, result);
					});
				}, Math.floor((Math.random() * 100) + 1))
			});
		}
		async.parallel(work, () => {
			expect(_.map(lruCache.dump(), (i) => i.k)).to.have.members([1, 2, 3, 4, 5]);
			done();
		});
	});

});
