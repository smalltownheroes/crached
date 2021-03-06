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

	it('tests the cache util', (done) => {
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

	it('resets the cache', () => {
		lruCache.reset();
	});

	it('tests the cache util when the fetch fails', (done) => {
		const util = new Util(lruCache);
		const fetchPromise = (key) => new Promise((resolve, reject) => {
			reject({ key, fail: true });
		});
		const work = [];
		for (let i of _.range(0, 100)) {
			work.push((cb) => {
				setTimeout(() => {
					const randomKey = Math.floor((Math.random() * 5) + 1);
					util.getOrFetch(randomKey, fetchPromise)
						.then(result => {
							cb(result);
						}).catch(err => {
							cb(null, err);
						});
				}, Math.floor((Math.random() * 100) + 1))
			});
		}
		async.parallel(work, () => {
			expect(_.map(lruCache.dump(), (i) => i.k)).to.have.members([]);
			done();
		});
	});

	it('Does not end up in a bad state if fetchPromise throws', done => {
		const fetchPromise = () => {throw new Error('Bam');};
		const util = new Util(lruCache);
		util.getOrFetch('someKey', fetchPromise)
			.catch(() => {
				expect(util.fetching['someKey']).to.be.eql(undefined);
				done();
			});
	});

	it('Releases all waiting promises', done => {
		let resolvePromise;
		const thePromise = new Promise((resolve, reject) => {
			resolvePromise = resolve;
		});
		const fetchPromise = () => thePromise;
		const util = new Util(lruCache);
		const after = (count, func) => {
			let countdown = count;
			return () => {
				if (--countdown === 0) {
					func();
				}
			}
		};
		const collect = after(3, done);
		util.getOrFetch('someKey', fetchPromise)
			.then(collect);
		util.getOrFetch('someKey', fetchPromise)
			.then(collect);
		util.getOrFetch('someKey', fetchPromise)
			.then(collect);
		resolvePromise();
	});
});
