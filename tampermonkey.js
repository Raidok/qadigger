// ==UserScript==
// @name         AKparse
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       Raidok
// @match        http://localhost:8080/*
// @grant        none
// ==/UserScript==
(function() {
    'use strict';

    if (document.querySelectorAll('td.popup-contents')[0].childNodes[0].textContent.indexOf('viga') === -1) {
        console.log('script aborted');
        return;
    }

    function getDataUri(url, callback) {
        var image = new Image();

        image.onload = function () {
            var canvas = document.createElement('canvas');
            canvas.width = this.naturalWidth; // or 'width' if you want a special/scaled size
            canvas.height = this.naturalHeight; // or 'height' if you want a special/scaled size

            canvas.getContext('2d').drawImage(this, 0, 0);

            console.log('loaded', url);
            callback(canvas.toDataURL('image/jpeg'));
        };

        image.src = url;
        console.log('loading', url);
    }

    function nodeListToArray(list) {
        var array= new Array(list.length);
        for (var i= 0, n= list.length; i<n; i++)
            array[i]= list[i];
        return array;
    }

    function parse() {
        return nodeListToArray(document.querySelectorAll('table.box td.box')).map(el => {
            var tds = el.querySelectorAll('td');
            if (!tds) {
                console.log('no tds!');
            }
            var q = tds[0].innerText;
            console.log(q, tds);
            var img = tds[1].querySelector('img');
            var imgSrc = img ? img.getAttribute('src') : undefined;
            var i = imgSrc ? { src: imgSrc } : undefined;
            var aHtml = tds[2];
            //console.log('vastused:', tds[2].innerHTML);
            var id = aHtml.querySelector('input[type=hidden]').getAttribute("value");
            var as = nodeListToArray(aHtml.querySelectorAll('input[type=checkbox]')).map(x => {
                var checked = !!x.getAttribute('checked');
                var green = !!(x.nextElementSibling.getAttribute('style') || '').match(/color:.?green/);
                var correct = green ? checked : !checked;
                return { checked: checked, green: green, correct: correct, text: x.nextElementSibling.innerText };
            });
            console.log(q,i,as);
            return { id: id, question: q, img: i, answers: as };
        });
    }

    function send(what, data) {
        var xhr = new XMLHttpRequest();

        xhr.open('POST', 'http://localhost:3000/' + what);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = function() {
            if (xhr.status === 200 || xhr.status === 204) {
                console.log('Success! Response:' + xhr.responseText);
            } else {
                console.log('Request failed. Responded ' + xhr.status + ' with content:' + xhr.responseText);
            }
        };

        xhr.send(JSON.stringify({
            version: GM_info.script.version,
            href: window.location.href,
            userAgent: window.agent,
            data: data
        }));
    }


    var data = parse();
    send('qa', data);

    var itemsProcessed = 0;

    data.forEach((item, index, array) => {

        if (item.img && item.img.src) {
            getDataUri(item.img.src, function(dataUri) {
                send('img', { id: item.id, src: item.img.src, dataUri: dataUri });
            });
        }
    });


})();
