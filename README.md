# Premiumize.me Fileviewer Improvements
A userscript that adds some convinience functions to the premiumize.me file (pre)viewer. This is especially useful when streaming series directly.
## Features
- adds buttons to the premiumize.me file previewer to play the next or prev episode
- adds button to the main page to reopen the last open file
- Autoplay next video if available
- save current time and resume on time if file is reopend

## Installation
- Install Tempermonkey for [firefox](https://tampermonkey.net/?ext=dhdg&browser=firefox) or [chrome](https://tampermonkey.net/?ext=dhdg&browser=chrome)
- open the Premiumize_buttons.user.js file in raw mode (or click [here](https://github.com/xerg0n/premiumize_buttons/raw/master/Premiumize_buttons.user.js))
- confirm installation

## Usage
- navigate to the folder with episodes
- open one of the files
- two buttons should have been added under the breadcrumps 
- the main page should now contain a 'reopen last' button

## Changelog
### 0.4
* code cleanup
* moved db to sets
* added time zero when video ended

### 0.3
* added function to save the current playback time
* added auto seek to last time if exists

### 0.2
* moved away from jQuery functions
* moved to newer javascript slectors, this removes support for older browsers
* moved to new file storage structure
