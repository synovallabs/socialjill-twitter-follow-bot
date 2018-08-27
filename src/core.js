const Twit = require('twit');
const wordingArray = require('../wording.json');

let drone =
{
	id_str: null,
	name: null,
	screen_name: null,
	description: null,
	followers_count: null,
	friends_count: null,
	statuses_count: null
};
let twit;
let spinner;
let option;
let intervalCountdown;
let intervalRun;

/**
 * verify
 *
 * @since 1.0.0
 *
 * @return Promise
 */

function verify()
{
	return new Promise((resolve, reject) =>
	{
		twit.get('account/verify_credentials', (error, data) =>
		{
			if (error)
			{
				reject(error);
			}
			else
			{
				drone =
				{
					id_str: data.id_str,
					name: data.name,
					screen_name: data.screen_name,
					description: data.description,
					followers_count: data.followers_count,
					friends_count: data.friends_count,
					statuses_count: data.statuses_count
				};
				resolve();
			}
		});
	});
}

/**
 * search
 *
 * @since 1.0.0
 *
 * @return Promise
 */

function _search()
{
	return twit.get('search/tweets',
	{
		q: option.get('searchQuery'),
		result_type: option.get('searchType'),
		lang: option.get('searchLang'),
		count: option.get('searchCount')
	});
}

/**
 * retweet
 *
 * @since 1.0.0
 *
 * @param tweetId string
 *
 * @return Promise
 */

function _retweet(tweetId)
{
	return new Promise((resolve, reject) =>
	{
		twit.post('statuses/retweet/' + tweetId, (error, data) =>
		{
			if (error)
			{
				spinner.fail(error);
				reject();
			}
			else
			{
				spinner.pass(data.text);
				resolve();
			}
		});
	});
}

/**
 * favorite
 *
 * @since 1.0.0
 *
 * @param tweetId string
 *
 * @return Promise
 */

function _favorite(tweetId)
{
	return new Promise((resolve, reject) =>
	{
		twit.post('favorites/create',
		{
			id: tweetId
		}, (error, data) =>
		{
			if (error)
			{
				spinner.fail(error);
				reject();
			}
			else
			{
				spinner.pass(data.text);
				resolve();
			}
		});
	});
}

/**
 * follow
 *
 * @since 1.0.0
 *
 * @param userId string
 *
 * @return Promise
 */

function _follow(userId)
{
	return new Promise((resolve, reject) =>
	{
		twit.post('friendships/create',
		{
			id: userId
		}, (error, data) =>
		{
			if (error)
			{
				spinner.fail(error);
				reject();
			}
			else
			{
				spinner.pass(data.name);
				resolve();
			}
		});
	});
}

/**
 * create promise array
 *
 * @since 1.0.0
 *
 * @param action string
 * @param statusArray array
 *
 * @return array
 */

function _createPromiseArray(action, statusArray)
{
	const retweetCount = option.get('retweetCount');
	const favoriteCount = option.get('favoriteCount');
	const dryRun = option.get('dryRun');

	let promiseArray = [];

	/* process status */

	statusArray.forEach(statusValue =>
	{
		if (statusValue.retweet_count >= retweetCount && statusValue.favorite_count >= favoriteCount && statusValue.user.id_str !== drone.id_str)
		{
			if (action === 'retweet')
			{
				promiseArray.push(dryRun ? _dryRun(statusValue.id_str) : _retweet(statusValue.id_str));
			}
			if (action === 'favorite')
			{
				promiseArray.push(dryRun ? _dryRun(statusValue.id_str) : _favorite(statusValue.id_str));
			}
			if (action === 'follow')
			{
				promiseArray.push(dryRun ? _dryRun(statusValue.user.id_str) : _follow(statusValue.user.id_str));
			}
		}
	});
	return promiseArray;
}

/**
 * unique by
 *
 * @since 1.0.0
 *
 * @param rawArray array
 * @param key string
 *
 * @return Promise
 */

function _uniqueBy(rawArray, key)
{
	return rawArray.filter((first, index) => rawArray.findIndex(second => first[key] === second[key]) === index);
}

/**
 * process
 *
 * @since 1.0.0
 *
 * @param action string
 *
 * @return Promise
 */

function process(action)
{
	return new Promise((resolve, reject) =>
	{
		_search()
			.then(response =>
			{
				const statusArray = _uniqueBy(response.data && response.data.statuses ? response.data.statuses : [], 'text');
				const promiseArray = _createPromiseArray(action, statusArray);

				Promise
					.all(promiseArray)
					.then(() => resolve())
					.catch(error => reject(error));
			})
			.catch(error => reject(error));
	});
}

/**
 * dry run
 *
 * @since 1.0.0
 *
 * @param text string
 *
 * @return Promise
 */

function _dryRun(text)
{
	return new Promise(resolve =>
	{
		spinner.skip(text);
		resolve();
	});
}

/**
 * background run
 *
 * @since 1.0.0
 *
 * @param action string
 * @param interval number
 */

function _backgroundRun(action, interval)
{
	let countdown = Math.ceil(interval / 1000);

	clearInterval(intervalCountdown);
	clearInterval(intervalRun);

	/* handle interval */

	intervalCountdown = setInterval(() =>
	{
		spinner.start(wordingArray.drone_waiting + ' ' + countdown-- + ' ' + wordingArray.seconds + wordingArray.point);
	}, 1000);
	intervalRun = setInterval(() => run(action), interval);
}

/**
 * run
 *
 * @since 1.0.0
 *
 * @param action string
 */

function run(action)
{
	const backgroundRun = option.get('backgroundRun');
	const backgroundInterval = Math.abs(option.get('backgroundInterval'));

	verify()
		.then(() =>
		{
			spinner.start(wordingArray.drone_connected + wordingArray.exclamation_mark);
			process(action)
				.then(() => backgroundRun ? _backgroundRun(action, backgroundInterval) : spinner.stop())
				.catch(() => backgroundRun ? _backgroundRun(action, backgroundInterval) : spinner.stop());
		})
		.catch(error => spinner.fail(error));
}

/**
 * init
 *
 * @since 1.0.0
 *
 * @param initArray array
 */

function init(initArray)
{
	twit = new Twit(initArray);
}

/**
 * construct
 *
 * @since 1.0.0
 *
 * @param dependency object
 *
 * @return object
 */

function construct(dependency)
{
	const exports =
	{
		init,
		run,
		process,
		verify
	};

	/* inject dependency */

	if (dependency.spinner && dependency.option)
	{
		spinner = dependency.spinner;
		option = dependency.option;
	}
	return exports;
}

module.exports = construct;