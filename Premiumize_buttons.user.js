// ==UserScript==
// @name         Premiumize.me Next File Button
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Adds a next and previous button to the premiumize.me file preview page
// @author       xerg0n
// @match        https://www.premiumize.me/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
main();
})();

async function waitFor(sel){
    while(!document.querySelector(sel)) {
        await new Promise(r => setTimeout(r, 500));
    }
}

function waitForClass(selector){
    new Promise((r, j)=>{
   if (document.getElementsByClassName(selector).length) {
       console.log("found");
       r();
    }})
}

function saveFolderFiles(){
    var file_links = [];
    var folder_id = document.URL.match(/folder_id=(\S*)/)[1];
    Array.prototype.forEach.call(document.querySelectorAll(".glyphicon-file"), function(el) {
        var file = {id: null, name: null, folder_id: folder_id};
        var element = el.parentNode.children[2];
        file.id = element.getAttribute('href').replace("/file?id=","");
        file.name = element.text;
        file_links.push(file);
    })
    console.log(folder_id);
    console.log(file_links);
    var files = JSON.parse(localStorage.getItem('files'));
    if (files == null){
        files = [];
    }
    var new_file_list = files.concat(file_links);
    localStorage.setItem('files', JSON.stringify(new_file_list));
}

function insertLastEpButton(){
    var lastFile = localStorage.getItem("lastFile")
    var btn_cont = document.createElement('a');
    document.createElement('span');
    btn_cont.innerHTML = '<span style="margin-right: 6px;" class="glyphicon glyphicon glyphicon-chevron-right"></span>'
    +'<span>Reopen last</span>';
    btn_cont.style.margin = "6px";
    btn_cont.setAttribute("href","/file?id="+lastFile);
    btn_cont.className = "btn btn-primary";
    var container = document.querySelectorAll('[data-reactid=".0.1.0"]')[0];
    container.appendChild(btn_cont);
}
function createButtons(){
    var breadcrumb = document.getElementsByClassName('breadcrumb')[0]
    var current_folder = breadcrumb.childNodes[breadcrumb.childNodes.length-4].firstChild.getAttribute("href").match(/folder_id=(\S*)/)[1];
    var currentFile = document.URL.match(/\/file\?id=(\S*)/)[1];
    var all_files = JSON.parse(localStorage.getItem('files'));
    var files = all_files.filter(file => file.folder_id == current_folder);
    //$(".panel-title").text().match(/S(\d\d)E(\d\d)/)
    localStorage.setItem("lastFile", currentFile);

    var index = files.findIndex((file) => file.id == currentFile);

    var main_container = document.getElementsByClassName('container')[0];
    var btn_prev = document.createElement('a');
    var btn_next = document.createElement('a');
    var container = document.createElement('div');
    container.style.height = "40px";
    btn_next.className = "btn btn-primary";
    btn_prev.className = "btn btn-primary";
    btn_next.style.float = "right";
    btn_next.innerText = "Next Episode"
    btn_prev.innerText = "Prev Episode"

    if (index < files.length-1){
        btn_next.setAttribute("href","/file?id="+files[index+1].id);
        btn_next.title = files[index+1].name;
        container.appendChild(btn_next);
        document.getElementById('player_html5_api')
            .addEventListener("ended", function(){location.href = "/file?id="+files[index+1].id});
    }
    if (index != 0){
        btn_prev.setAttribute("href","/file?id="+files[index-1].id);
        btn_prev.title = files[index-1].name;
        container.appendChild(btn_prev);
    }
    main_container.insertBefore(container, main_container.childNodes[4]);

}
function main(){
    if (/folder_id=/.test(document.URL)){
        waitFor(".glyphicon-file").then(saveFolderFiles);
    }else if (/downloader/.test(document.URL)){
        if (localStorage.getItem("lastFile")){
            console.log('inserting last');
            waitFor(".btn-primary").then(insertLastEpButton);
        }
    }else{
       waitFor(".vjs-control-bar").then(createButtons);
    }
}
