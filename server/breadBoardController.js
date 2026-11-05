const axios = require('axios').default;
var Gpio = require('onoff').Gpio;
var LED = new Gpio(17, 'out');
var blueButton = new Gpio(21, 'in', 'both');
var greenButton = new Gpio(20, 'in', 'both');
var yellowButton = new Gpio(19, 'in', 'both');
var redButton = new Gpio(18, 'in', 'both');

blueButton.watch(function(err, value) {
    if(err){
        console.error('There was an error', err);
        return;
    }
    axios.get('http://192.168.0.14:8000/vup').catch(err=>console.error(err));
    LED.writeSync(value);
});

greenButton.watch(function(err, value) {
    if(err){
        console.error('There was an error', err);
        return;
    }
    axios.get('http://192.168.0.14:8000/vdown').catch(err=>console.error(err));
    LED.writeSync(value);
});

yellowButton.watch(function(err, value) {
    if(err){
        console.error('There was an error', err);
        return;
    }
    axios.get('http://192.168.0.14:8000/turn_off').catch(err=>console.error(err));
    LED.writeSync(value);
});

redButton.watch(function(err, value) {
    if(err){
        console.error('There was an error', err);
        return;
    }
    axios.get('http://192.168.0.14:8000/turn_on').then(()=> axios.get('http://192.168.0.14:8000/HDMIsource').catch(err=>console.error(err)) ).catch(err=>console.error(err));
    LED.writeSync(value);
});

function unexportOnClose() {
    LED.writeSync(0);
    LED.unexport();
    blueButton.unexport();
    greenButton.unexport();
    yellowButton.unexport();
    redButton.unexport();
};

process.on('SIGINT', unexportOnClose);