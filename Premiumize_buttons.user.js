// ==UserScript==
// @name         Premiumize.me Next File Button
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  Adds a next and previous button to the premiumize.me file preview page
// @author       xerg0n
// @match        https://www.premiumize.me/*
// @grant        none
// ==/UserScript==

class Store {
    constructor() {
        this.key_main = "folders"
        this.key_last = "lastFile"
    
        // used to filter files that are supposed to be opend
        var whitelist_items = [
        ".mkv$",
        ".avi$",
        ".mov$",
        ".wmv$",
        ".m4v$",
        ".mpeg$"
        ];
        this.whitelist = new RegExp(whitelist_items.join("|"), "i");
    }

    setLastFile(file){
        localStorage.setItem(this.key_last, file.id);
    }

    getLastFile(){
        var id = localStorage.getItem(this.key_last)
        var file = this.getFile(id);
        return file;
    }

    addFolder(folder_id, files) {
        var all_folders = this.getAllFolders()
        all_folders[folder_id] = {
            'files': files,
            'name': 'test',
            'url': 'http://test.com'
        }
        this.setFiles(all_folders)
    }

    getFolder(folder_id) {
        return this.getAllFolders()[folder_id];
    }

    getFile(id, folder_id=null){
        if (folder_id){
            return this.getAllFolders()[folder_id].files.filter(file => file.id == id)[0];
        }else{
            return this.getFileFromAll(id);
        }
    }

    getFileFromAll(fileid) {
        var folders = this.getAllFolders();
        for (var key in folders) {
            if (folders.hasOwnProperty(key)) {
                var id = folders[key].files.findIndex((db_file) => db_file.id == fileid);
                if (id != -1){
                    return folders[key].files[id];
                }
            }
        }
    }

    getNext(folder_id, id, filter=this.whitelist) {
        var folder_files = this.getFolder(folder_id, filter=filter).files
        if (filter){
            folder_files = folder_files.filter(file => file.name.match(this.whitelist));
        }
        var index = folder_files.findIndex((file) => file.id == id);
        if (index < folder_files.length-1){
            return folder_files[index+1]
        }else{
            return null
        }
    }

    getPrev(folder_id, id, filter=this.whitelist) {
        var folder_files = this.getFolder(folder_id, filter=filter).files
        if (filter){
            folder_files = folder_files.filter(file => file.name.match(this.whitelist));
        }
        var index = folder_files.findIndex((file) => file.id == id);
        if (index != 0){
            return folder_files[index-1]
        }else{
            return null
        }
    }

    getAllFolders(){
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
        var all_folders = this.getAllFolders()
        for (var key in all_folders) {
            if (all_folders.hasOwnProperty(key)) {
                var id = all_folders[key].files.findIndex((db_file) => db_file.id == file.id);
                if (id){
                    all_folders[key].files[id] = file;
                    this.setFiles(all_folders);
                    return
                }
            }
        }
    }
}

/**
Player wrapper
**/
class Player {
    init(){
        this.current_file = store.getFile(parser.getCurrentFileId(), parser.getFolderId())
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

/**
   Parsing the elemnts and returning
**/
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

    getFileLinks(folder_id){
        var file_links = [];
        Array.prototype.forEach.call(document.querySelectorAll(".glyphicon-file"), function(el) {
            var file = {id: null, name: null, folder_id: folder_id};
            var element = el.parentNode.children[2];
            file.id = element.getAttribute('href').replace("/file?id=","");
            file.name = element.text;
            file_links.push(file);
        })
        return file_links;
    }

}

/** Utils **/
async function waitFor(sel){
    while(!document.querySelector(sel)) {
        await new Promise(r => setTimeout(r, 500));
    }
}


function makeButton(text, file){
    var btn = document.createElement('a');
    btn.className = "btn btn-primary";
    btn.innerText = text
    btn.setAttribute("href","/file?id="+file.id);
    btn.title = file.name;
    return btn
}

/**
** The Pages
**/

function folder_page(){
    var folder_id = parser.getFolderIdFromUri();
    var file_links = parser.getFileLinks(folder_id);
    store.addFolder(folder_id, file_links)
}

function downloader_page(){
    var lastFile = store.getLastFile();
    var btn_cont = makeButton("Reopen last", lastFile);

    btn_cont.innerHTML = '<span class="glyphicon glyphicon glyphicon-chevron-right"></span>'
    +'<span>Reopen last</span>';
    btn_cont.style = "margin-left: 6px";

    var container = document.querySelectorAll('[data-reactid=".0.1.0"]')[0];
    container.appendChild(btn_cont);
}

function playback_page(){
    player.init();
    var current_file = store.getFile(parser.getCurrentFileId(), parser.getFolderId())

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
        waitFor(".glyphicon-file").then(folder_page);
    }else if (/downloader/.test(document.URL)){
        if (localStorage.getItem("lastFile")){
            waitFor(".btn-primary").then(downloader_page);
        }
    }else{
       waitFor(".vjs-control-bar").then(playback_page);
    }
}
var parser = new Parser();
var store = new Store();
var player = new Player();
main();
