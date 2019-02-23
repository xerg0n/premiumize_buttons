// ==UserScript==
// @name         Premiumize.me Next File Button
// @namespace    http://tampermonkey.net/
// @version      0.42
// @description  Adds a next and previous button to the premiumize.me file preview page
// @author       xerg0n
// @match        https://www.premiumize.me/*
// @grant        none
// ==/UserScript==

class Store {
    constructor() {
        this.key_main = "folders"
        this.key_last = "lastFile"

        var whitelist_items = [
        ".mkv$",
        ".avi$",
        ".mov$",
        ".wmv$",
        ".mpeg$"
        ];
        this.whitelist = new RegExp(whitelist_items.join("|"), "i");
    }

    setLastFile(file){
        localStorage.setItem(this.key_last, file.id);
    }
    getLastFile(){
        var id = localStorage.getItem(this.key_last)
        return this.getFileFromAll(id);
    }
    addFolder(folder_id, files) {
        var all_files = this.getAllFiles()
        all_files[folder_id] = files
        this.setFiles(all_files)
    }

    getFolder(folder_id, filter=this.whitelist) {
        if (!filter){
            return this.getAllFiles()[folder_id];
        }else{
            return this.getAllFiles()[folder_id].filter(file => file.name.match(this.whitelist));
        }
    }

    getFile(folder_id, id) {
        return this.getAllFiles()[folder_id].filter(file => file.id == id)[0];
    }
    getFileFromAll(fileid) {
        var files = this.getAllFiles();
                        console.log(files)
        for (var key in files) {
            if (files.hasOwnProperty(key)) {
                var id = files[key].findIndex((db_file) => db_file.id == fileid);
                if (id){
                    return files[key][id];
                }
            }
        }
    }

    getNext(folder_id, id, filter=this.whitelist) {
        var folder = this.getFolder(folder_id, filter)
        var index = folder.findIndex((file) => file.id == id);
        if (index < folder.length-1){
            return folder[index+1]
        }else{
            return null
        }
    }

    getPrev(folder_id, id, filter=this.whitelist) {
        var folder = this.getFolder(folder_id, filter=true)
        var index = folder.findIndex((file) => file.id == id);
        if (index != 0){
            return folder[index-1]
        }else{
            return null
        }
    }
    getAllFiles(){
        var files = JSON.parse(localStorage.getItem(this.key_main));
        if (files == null){
            files = {};
        }
        return files
    }
    setFiles(files){
        var ser_files = JSON.stringify(files);
        localStorage.setItem(this.key_main, ser_files)
    }
    updateFile(file){
        var files = this.getAllFiles()
        for (var key in files) {
            if (files.hasOwnProperty(key)) {
                var id = files[key].findIndex((db_file) => db_file.id == file.id);
                if (id){
                    files[key][id] = file;
                    this.setFiles(files);
                    return
                }
            }
        }
    }
}

class Parser {
    getCurrentFileId(){
        return document.URL.match(/\/file\?id=(\S*)/)[1];
    }

    getFolderId(){
        var breadcrumb = document.getElementsByClassName('breadcrumb')[0]
        var id = breadcrumb.childNodes[breadcrumb.childNodes.length-4].firstChild.getAttribute("href")
            .match(/folder_id=(\S*)/)[1];

        return id
    }
    getFolderIdFromUri(){
        return document.URL.match(/folder_id=(\S*)/)[1];
    }
    getPlayer(){
        return document.getElementById('player_html5_api');
    }


}

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
    var folder_id = parser.getFolderIdFromUri();

    Array.prototype.forEach.call(document.querySelectorAll(".glyphicon-file"), function(el) {
        var file = {id: null, name: null, folder_id: folder_id};
        var element = el.parentNode.children[2];
        file.id = element.getAttribute('href').replace("/file?id=","");
        file.name = element.text;
        file_links.push(file);
    })
    store.addFolder(folder_id, file_links)
}



function insertLastEpButton(){
    var lastFile = store.getLastFile();
    var btn_cont = makeButton("Reopen last", lastFile);

    console.log(lastFile)
    btn_cont.innerHTML = '<span style="margin-right: 6px;" class="glyphicon glyphicon glyphicon-chevron-right"></span>'
    +'<span>Reopen last</span>';
    btn_cont.style.margin = "6px";

    var container = document.querySelectorAll('[data-reactid=".0.1.0"]')[0];
    container.appendChild(btn_cont);
}

function makeButton(text, file){
    var btn = document.createElement('a');
    btn.className = "btn btn-primary";
    btn.innerText = text
    btn.setAttribute("href","/file?id="+file.id);
    btn.title = file.name;
    return btn
}


class Player {
    init(){
        this.current_file = store.getFile(parser.getFolderId(), parser.getCurrentFileId())
        this.attach()
        this.restoreTime()
        this.registerListeners()
        this.flag = true
    }
    attach(){
       this.player = parser.getPlayer();
         console.log(this.player)
    }
    registerListeners(){
        this.player.addEventListener("timeupdate", this.timechange);
    }
    timechange(){
        var time = player.player.currentTime
        player.player.current_file.time = time
        store.updateFile(player.current_file);
    }
    restoreTime(){
        if (this.current_file.time){
            this.player.currentTime = this.current_file.time;
        }
    }
    registerNext(file){
        this.player.addEventListener("ended", function(){
            location.href = "/file?id="+file.id

            // set time to 0
            player.player.current_file.time = 0
            store.updateFile(player.current_file);
        });
    }
}

function playback_page(){
    player.init();
    var current_file = store.getFile(parser.getFolderId(), parser.getCurrentFileId())

    store.setLastFile(current_file);

    //resume playback and register event listener


    // button container
    var container = document.createElement('div');
    container.style.height = "40px";

    var next_file = store.getNext(parser.getFolderId(), parser.getCurrentFileId())
    var prev_file = store.getPrev(parser.getFolderId(), parser.getCurrentFileId())


    // add buttons
    if (next_file){
        var btn_next = makeButton("Next Episode", next_file)
        btn_next.style.float = "right";
        container.appendChild(btn_next);
        player.registerNext(next_file);
    }
    if (prev_file){
        var btn_prev = makeButton("Prev Episode", prev_file)
        container.appendChild(btn_prev);
    }

    var main_container = document.getElementsByClassName('container')[0];
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
       waitFor(".vjs-control-bar").then(playback_page);
    }
}
var parser = new Parser();
var store = new Store();
var player = new Player();
main();
