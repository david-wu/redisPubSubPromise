const _ = require('lodash');
const redis = require('redis');

const redisPsp = {

	env: 'production',
	configsByEnv: {
		production: {
			domain: 'localhost',
			port: 6388,
		},
		development: {
			domain: 'localhost',
			port: 6388,
		}
	},

	cbChannelTag: '_CB',

	init(options){
		_.defaults(this, options);
	},

	getRedisConfigs: function(env){
		return redisPsp.configsByEnv[env || redisPsp.env]
	},

	emitP: function(channel, message){
		return new Promise(function(resolve, reject){
			redisPsp.emit(channel, message, resolve);
		});
	},

	emit: function(channel, message, callback){
		const redisConfigs = redisPsp.getRedisConfigs()
		const pub = redis.createClient(redisConfigs.port, redisConfigs.domain)
		const sub = redis.createClient(redisConfigs.port, redisConfigs.domain)
		const callbackChannel = channel + redisPsp.cbChannelTag
		const messageId = getGuid()

		sub.on('subscribe', function(){
			const wrappedMessage = {
				id: messageId,
				message: message
			}
			pub.publish(channel, JSON.stringify(wrappedMessage))
		})
		sub.on('message', function(channel, wrappedMessageStr){
			const wrappedMessage = JSON.parse(wrappedMessageStr)
			if(wrappedMessage.id === messageId){
				callback(wrappedMessage.message)
				pub.quit()
				sub.quit()
			}
		})
		sub.subscribe(callbackChannel)
	},

	onP: function(channel, callback){
		return new Promise(function(resolve, reject){
			redisPsp.on(channel, callback, resolve);
		})
	},

	on: function(channel, callback, onSubscribe){
		const redisConfigs = redisPsp.getRedisConfigs();
		const pub = redis.createClient(redisConfigs.port, redisConfigs.domain);
		const sub = redis.createClient(redisConfigs.port, redisConfigs.domain);
		const channelOut = channel + redisPsp.cbChannelTag;

		sub.on('message', function(channel, wrappedMessageStr){
			const wrappedMessage = JSON.parse(wrappedMessageStr)
			const messageId = wrappedMessage.id
			const message = wrappedMessage.message

			const returnVal = callback(message);
			if(returnVal && returnVal.then){
				returnVal.then(sendMessage)
			}else{
				sendMessage(returnVal)
			}

			function sendMessage(message){
				const wrappedMessage = {
					id: messageId,
					message: message
				}
				pub.publish(channelOut, JSON.stringify(wrappedMessage), function(err){
					pub.quit()
					sub.quit()
				})
			}
		})
		sub.on('subscribe', onSubscribe)
		sub.subscribe(channel)
	},
}

// http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
function getGuid(){
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){
	    const r = Math.random()*16 | 0
	    const v = (c==='x') ? r : (r&0x3|0x8);
	    return v.toString(16);
	});
}

module.exports = redisPsp



