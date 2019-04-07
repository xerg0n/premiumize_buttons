// ==UserScript==
// @name         Premiumize.me Next File Button
// @namespace    http://tampermonkey.net/
// @version      0.72
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
            ".mp4$",
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
    hasFolder(folder_id){
        return (folder_id in this.getAllFolders())
    }
    addFolderOld(folder_id, files) {
        var all_folders = this.getAllFolders()

        if (!this.hasFolder(folder_id)){
            console.log('added',files.length, 'files')

            all_folders[folder_id] = {
                'files': files,
                'name': 'test',
                'url': 'http://test.com'
            }
            this.setFiles(all_folders)
        }else{
            console.log('folder already saved')
        }
    }
    addFolder(folder){
        var all_folders = this.getAllFolders()
        if (!this.hasFolder(folder.id)){
            all_folders[folder.id] = folder
            this.setFiles(all_folders)
        }else{
            console.log('folder already saved')
        }
    }
    getFolder(folder_id) {
        return this.getAllFolders()[folder_id];
    }

    getFile(id, folder_id=null){
        if (folder_id){
            console.log(this.getAllFolders()[folder_id])
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
                if (id > -1){
                    all_folders[key].files[id] = file;
                    this.setFiles(all_folders);
                    return
                }
            }
        }
    }
}

/*
* Player wrapper
*/
class Player {
    constructor(){
        this.parser = new Parser()
        console.log(this.parser.getFolderId())
        this.current_file = store.getFile(this.parser.getCurrentFileId(), this.parser.getFolderId())
        this.player = this.parser.getPlayer();
        this.playerElement = this.parser.getPlayerElement()
        this.restoreTime()
        this.registerListeners()
    }
    registerListeners(){
        this.playerElement.addEventListener("timeupdate", this.timechange.bind(this), true);
        this.playerElement.addEventListener("ended", this.ended.bind(this),true);
    }
    timechange(){
        console.log('[Player] timeupdate')
        var time = this.player.currentTime()
        this.current_file.time = time
        if (this.player.remainingTime() < 120){
            this.current_file.finished = true
        }
        store.updateFile(this.current_file);
    }
    restoreTime(){
        if (this.current_file.time){
            this.playerElement.currentTime = this.current_file.time;
        }
    }
    setNext(file){
        this.next_file = file
    }
    ended(){
        // set time to 0
        this.current_file.time = 0
        this.current_file.finished = true
        store.updateFile(this.current_file);

        if (this.next_file){
            location.href = "/file?id="+this.next_file.id
        }
    }
}

/*
*  Parsing the elemnts and returning
*/
class Parser {
    getCurrentFileId(){
        return document.URL.match(/\/file\?id=(\S*)/)[1];
    }
    getBreadcrumb(){
        return document.getElementsByClassName('breadcrumb')[0].childNodes
    }
    getFolderId(){
        var breadcrumb = this.getBreadcrumb()
        var id = breadcrumb[breadcrumb.length-4].firstChild.getAttribute("href")
        .match(/folder_id=(\S*)/)[1];

        return id
    }

    getFolderIdFromUri(){
        return document.URL.match(/folder_id=(\S*)/)[1];
    }
    getPlayerElement(){
        return document.getElementById('player_html5_api');
    }
    getPlayer(){
        return window.player;
    }

    markFilesFinished(finished_ids){
        console.log(finished_ids)
        Array.prototype.forEach.call(document.querySelectorAll(".glyphicon-file"), function(el) {
            var element = el.parentNode.children[2]
            var id = element.getAttribute('href').replace("/file?id=","");
            if(finished_ids.has(id)){
                element.style.textDecoration = 'line-through'
            }
        })
    }

    getFileLinks(folder_id){
        var file_links = [];
        Array.prototype.forEach.call(document.querySelectorAll(".glyphicon-file"), function(el) {
            var file = {
                name: null,
                id: null,
                time: 0,
                folder_id: folder_id
            };
            var element = el.parentNode.children[2];
            file.id = element.getAttribute('href').replace("/file?id=","");
            file.name = element.text;
            file_links.push(file);
        })
        return file_links;
    }
    getFolder(){
        var id = this.getFolderIdFromUri();
        var bread = this.getBreadcrumb()
        var folder = {
            files: this.getFileLinks(id),
            name: bread[bread.length-1].innerText,
            url: bread[bread.length-1].baseURI,
            id: id,
        }
        return folder
    }
    currentPage(){
        if (/folder_id=/.test(document.URL)){
            return 'folder'
        }
        if (/downloader/.test(document.URL)){
            return 'downloader'
        }
        if (/file\?id=/.test(document.URL)){
            return 'playback'
        }
        return 'unknown'
    }
}



/*
* The Pages
*/
class Pages{
    constructor(){
        this.parser = new Parser()
        var current_page = this.parser.currentPage()
        console.log(current_page)
        switch (current_page){
            case 'folder':
                Utils.waitFor(".glyphicon-file").then(this.folder.bind(this),true);
                break
            case 'downloader':
                Utils.waitFor(".btn-primary").then(this.downloader.bind(this),true);
                break
            case 'playback':
                Utils.waitFor(".vjs-control-bar").then(this.playback.bind(this), true);
                break
            default:
                console.log('unknown page')
                break
        }
    }

    folder(){
        var folder_id = this.parser.getFolderIdFromUri();
        if (store.hasFolder(folder_id)){
            var ids = new Set()
            store.getFolder(folder_id).files.forEach((f) => f.finished && ids.add(f.id))
            this.parser.markFilesFinished(ids)
        }else{
            var folder = this.parser.getFolder();
            store.addFolder(folder)
        }
    }

    downloader(){
        var lastFile = store.getLastFile();
        var btn_cont = Utils.makeButton("Reopen last", lastFile);

        btn_cont.innerHTML = '<span class="glyphicon glyphicon glyphicon-chevron-right"></span>'
            +'<span>Reopen last</span>';
        btn_cont.style = "margin-left: 6px";

        var container = document.querySelectorAll('[data-reactid=".0.1.0"]')[0];
        container.appendChild(btn_cont);
    }

    playback(){
        var player_container = new Player();

        var current_file = store.getFile(this.parser.getCurrentFileId(), this.parser.getFolderId())

        store.setLastFile(current_file);


        // button container
        var container = document.createElement('div');
        container.style.height = "40px";

        var next_file = store.getNext(this.parser.getFolderId(), this.parser.getCurrentFileId())
        var prev_file = store.getPrev(this.parser.getFolderId(), this.parser.getCurrentFileId())


        // add buttons
        if (next_file){
            player_container.setNext(next_file);

            var btn_next = Utils.makeButton("Next Episode", next_file)
            btn_next.style.float = "right";
            container.appendChild(btn_next);
        }
        if (prev_file){
            var btn_prev = Utils.makeButton("Prev Episode", prev_file)
            container.appendChild(btn_prev);
        }

        var main_container = document.getElementsByClassName('container')[0];
        main_container.insertBefore(container, main_container.childNodes[4]);
    }
}

/*
* Utils
*/
class Utils{
    static async waitFor(sel){
        while(!document.querySelector(sel)) {
            await new Promise(r => setTimeout(r, 500));
        }
    }


    static makeButton(text, file){
        var btn = document.createElement('a');
        btn.className = "btn btn-primary";
        btn.innerText = text
        btn.setAttribute("href","/file?id="+file.id);
        btn.title = file.name;
        return btn
    }
}


var store = new Store();
var pages = new Pages();
