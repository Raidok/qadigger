// ==UserScript==
// @name         Walker
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        http://localhost:8080/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    var submit = document.querySelector('input[value=Kontrolli]');
    var reset = document.querySelector('input[value=Uuesti]');

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    if (submit) {
        console.log('submit form');
        Array.prototype.slice.call(document.querySelectorAll('table.popup input[type="checkbox"]')).forEach(function(cb) {
            var checked = !Math.floor(Math.random()*2);
            cb.checked = checked;
            console.log(cb.value, checked);
        });
        setTimeout(function () {
            submit.click()
        }, getRandomInt(30000, 60000));
    } else if (reset) {
        console.log('reset form');
        setTimeout(function () {
            reset.click()
        }, getRandomInt(10000, 30000));
    }

})();
