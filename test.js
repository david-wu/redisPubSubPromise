const redisPsp = require('./index.js')

function startServices(){
	return Promise.all([
		doublingService(),
		greetingService(),
		delayedEchoService(),
	])
}

function doublingService(){
	return redisPsp.onP('double', function(num){
		return num*2
	})
}

function greetingService(){
	return redisPsp.onP('greet', function(name){
		return 'Hello, '+name
	})
}

function delayedEchoService(){
	return redisPsp.onP('delayedEcho', function(data){
		return new Promise(function(resolve, reject){
			setTimeout(function(){
				resolve(data.text)
			}, data.delay)
		})
	})
}


startServices()
	.then(function(){

		redisPsp.emitP('double', 2)
			.then(function(response){
				console.log('doubled:', response);
			})

		redisPsp.emitP('greet', 'Maggie')
			.then(function(response){
				console.log('greeted:', response);
			})

		redisPsp.emitP('delayedEcho', {text: 'myText', delay: 3000})
			.then(function(response){
				console.log('delayed text:', response)
			})

	})
