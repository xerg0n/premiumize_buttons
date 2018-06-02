// ==UserScript==
// @name         Premiumize.me Next File Button
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Adds a next and previous button to the premiumize.me file preview page
// @author       xerg0n
// @match        https://www.premiumize.me/file*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
main();

})();

function waitFor(selector){
    var checkExist = setInterval(function() {
   if ($('.glyphicon-file').length) {
      main();
      clearInterval(checkExist);
   }
}, 100);
}

function saveFolderFiles(){
     var file_links = [];
     $(".glyphicon-file").siblings("a").each( function(){var lnk = this.getAttribute("href");
                                                            file_links.push(lnk.replace("/file?id=",""))})
    var folderBlob = document.URL.match(/folder_id=(\S*)/);
    console.log(folderBlob[1]);
    console.log(file_links);
    localStorage.setItem(folderBlob[1], JSON.stringify(file_links));
}
function createButtons(){
    var currentFolder = $(".breadcrumb > li:nth-last-child(2) > a").attr("href").match(/folder_id=(\S*)/)[1];
    var currentFile = $(".breadcrumb > li:nth-last-child(1) > a").attr("href").match(/\/file\?id=(\S*)/)[1];
    var files = JSON.parse(localStorage.getItem(currentFolder));
    //$(".panel-title").text().match(/S(\d\d)E(\d\d)/)
    console.log(files);

    var index = files.indexOf(currentFile);

    var btn_prev = document.createElement('a');
    var btn_next = document.createElement('a');
    var container = document.createElement('div');
    container.style.height = "20px";
    btn_next.className = "btn btn-primary";
    btn_prev.className = "btn btn-primary";
    btn_next.style.float = "right";
    btn_next.innerText = "Next Episode"
    btn_prev.innerText = "Prev Episode"

    if (index < files.length-1){
        btn_next.setAttribute("href","/file?id="+files[index+1]);
        container.appendChild(btn_next);
    }
    if (index != 0){
        btn_prev.setAttribute("href","/file?id="+files[index-1]);
        container.appendChild(btn_prev);
    }
    $(container).insertBefore( "div.panel-body" );
}
function main(){
    if (/folder_id=/.test(document.URL)){
        waitFor(".glyphicon-file")
       saveFolderFiles();
    }else{
        waitFor("#player_html5_api")
       createButtons();
    }
}