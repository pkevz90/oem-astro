let innerH = `
<div id="canvas-div">
        <canvas id="main-plot"></canvas>
    </div>
    <div id="time-slider">
        <input id="time-slider-range" type="range" min=0 max=86164 step=0.1 value=0 oninput="mainWindow.desired.scenarioTime = Number(this.value)">
    </div>
    <div class="full-page-menu hidden panel" id="add-satellite-panel">
        <div class="title-text" style="width: 100%; text-align: center; height: auto; font-weight: 900;">Add Satellite</div>
        <div>
            <div class="title-text">Initial State</div>
            <div style="display: flex; justify-content: space-evenly; align-items: center;">
                <div>
                    <div style="margin: 20px 5px">A<sub>e</sub> <input class="rmoe" oninput=initStateFunction(this) style="width: 4em" type="Number" value="0"> km</div>
                    <div style="margin: 20px 5px">R<sub>c</sub> <input class="rmoe" oninput=initStateFunction(this) style="width: 4em" type="Number" value="0"> km</div>
                    <div style="margin: 20px 5px">I<sub>c</sub> <input class="rmoe" oninput=initStateFunction(this) style="width: 4em" type="Number" value="0"> km</div>
                    <div style="margin: 20px 5px">B<sub>o</sub> <input class="rmoe" oninput=initStateFunction(this) style="width: 4em" type="Number" value="0"> deg</div>
                    <div style="margin: 20px 5px">Z<sub>max</sub> <input class="rmoe" oninput=initStateFunction(this) style="width: 4em" type="Number" value="0"> km</div>
                    <div style="margin: 20px 5px">M<sub>o</sub> <input class="rmoe" oninput=initStateFunction(this) style="width: 4em" type="Number" value="0"> deg</div>
                </div>
                <div>
                    <div style="margin: 20px 5px">R <input oninput=initStateFunction(this) style="width: 4em" type="Number" value="0"> km</div>
                    <div style="margin: 20px 5px">I <input oninput=initStateFunction(this) style="width: 4em" type="Number" value="0"> km</div>
                    <div style="margin: 20px 5px">C <input oninput=initStateFunction(this) style="width: 4em" type="Number" value="0"> km</div>
                    <div style="margin: 20px 5px">V<sub>x</sub> <input oninput=initStateFunction(this) style="width: 4em" type="Number" value="0"> m/s</div>
                    <div style="margin: 20px 5px">V<sub>y</sub> <input oninput=initStateFunction(this) style="width: 4em" type="Number" value="0"> m/s</div>
                    <div style="margin: 20px 5px">V<sub>z</sub> <input oninput=initStateFunction(this) style="width: 4em" type="Number" value="0"> m/s</div>
                </div>
                
            </div>
            <div onclick=initStateFunction(this) style="font-size: 1.5em; padding: 14px 4px;" class="panel-button hoverable noselect">To Curvilinear</div>
            <div style="margin: 20px 5px"><input autocomplete="off" placeholder="R I C Rd Id Cd" style="width: 100%;" value="" type="text" id="parse-text"></div>
            <div onclick="parseState(this)" style="font-size: 1.5em; padding: 14px 4px;" class="panel-button hoverable noselect">Parse</div>
        
        </div>
        <div>
            <div class="title-text">Satellite Details</div>
            <div style="margin: 20px 5px">
                <select name="" id="">
                    <option value="delta">Delta</option>
                    <option value="3-star">3-Point Star</option>
                    <option value="4-star">4-Point Star</option>
                    <option value="star">5-Point Star</option>
                    <option value="diamond">Diamond</option>
                    <option value="triangle">Triangle</option>
                    <option value="square">Square</option>
                    <option value="pentagon">Pentagon</option>
                    <option value="hexagon">Hexagon</option>
                    <option value="septagon">Septagon</option>
                    <option value="octagon">Octagon</option>
                </select>
            </div>
            <div style="margin: 20px 5px">Acceleration <input style="width: 4em;" value="10" type="Number"> mm/s<sup>2</sup></div>
            <div style="margin: 20px 5px">Color</sub> <input style="width: 4em;" value="#ff0000" type="color"></div>
            <div style="margin: 20px 5px">Name <input style="width: 6em;" value="" type="text"></div>
            <div onclick="initStateFunction(this)" id="add-satellite-button" style="font-size: 1.5em; padding: 14px 4px;" class="panel-button hoverable noselect">Add Satellite</div>
            <div><span onclick="editSatellite(this)" style="font-size: 1.5em; padding: 2px 4px; width: 50%;" class="panel-button hoverable noselect">Update</span><select onchange="openPanel(this)" style="font-size: 2em; width: 50%;" name="" id="edit-select">
                
            </select></div>
            <div onclick="closeAll()" style="font-size: 1.5em; padding: 14px 4px;" class="panel-button hoverable noselect">Cancel</div>
        
        </div>
    </div>
    <div class="full-page-menu panel hidden" id="burns-panel">
        <div class="title-text" style="width: 100%; text-align: center; font-weight: 900;">View/Edit Burns</div>
        <div style="width: 90%;" >
            <div style="margin-left: 35%; width: 30%;" class="title-text">
                <select id="satellite-way-select" style="font-size: 1em">
                    <option value="0">Blue Triangle</option>
                    <option value="1">Red Circle</option>
                </select>
            </div>
            <table id="waypoint-table" style="width: 100%; margin-top: 2%;">
                <thead>
                    <tr>
                        <th>Start Time</th>
                        <th>Target (R, I, C)</th>
                        <th>Transfer Time</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                    </tr>
                </tbody>
            </table>
            <div style="margin-top:2%; padding: 2% 0%; display: flex; justify-content: space-evenly; align-items: center; flex-wrap: wrap;">
                <div class="add-value">
                    <input type="datetime-local" id="add-start-time" name="meeting-time" value="2021-04-01T00:00" class="center"> 
                </div>
                <div class="add-value">
                    Time: <input class="center" type="Number" id="add-tran-time" value="120" style="width: 4em"> min
                </div>
                <div class="add-value">
                    R: <input class="center" type="Number" value="0" style="width: 4em"> km
                </div class="add-value"> 
                <div class="add-value">
                    I: <input class="center" type="Number" value="0" style="width: 4em"> km
                </div> 
                <div class="add-value">
                    C: <input class="center" id="add-cross" type="Number" value="0" style="width: 4em"> km 
                </div>
            </div>
            <div style="margin-top:1%; padding: 2% 0%; display: flex; justify-content: space-evenly; align-items: center; flex-wrap: wrap;">
                <div class="">
                    <!-- <span style="padding: 10px; font-size: 1.5em" id="add-waypoint-button">Add</span> -->
                    <button style="padding: 10px; font-size: 1.5em" id="add-waypoint-button">Add</button>
                </div>
                <div title="Program will add two waypoints, one that will get you to target, and one timed to stop you right when you arrive">
                    <span style="font-size: 2em;">Zero RI Velocity</span> <input style="height: 1.5em; cursor: pointer;" type="checkbox"></div>
                </div>
                <div style="font-size: 1.5em; padding: 14px 4px;" id="export-burns" class="panel-button hoverable noselect">Export Burn List</div>
                <div onclick="closeAll()" style="font-size: 1.5em; padding: 14px 4px;" class="close-button panel-button hoverable noselect">Close</div>
            </div>
            
        </div>    
    </div>
    <div class="full-page-menu panel hidden" id="options-panel">
        <div class="title-text" style="width: 100%; text-align: center; height: auto; font-weight: 900;">Options</div>
        <div>
            <div class="title-text">Time & Location</div>
            <div style="margin: 20px 5px">Start Date <input style="width: 60%" type="datetime-local" id="start-time" name="meeting-time"
                    value="2019-06-01T00:00"></div>
            <div style="margin: 20px 5px">Scenario Length <input value="24" type="Number" min="0" max="360" step="1"> hrs</div>
            <div style="margin: 20px 5px">Reference SMA <input value="42164" type="Number" min="6700" max="50000" step="1"> km</div>
            <div style="margin: 20px 5px">Sun Time <input value="0000" type="Text" maxLength="4" style="width: 4em"></div>
            <div style="margin: 20px 5px">Sun Cross Angle <input style="width: 3em" value="0" type="Number" min="-90" max="90"><sup>o</sup></div>
            <div style="margin: 20px 5px" class="title-text">Recording</div>
            <div style="margin: 20px 5px">Start Epoch <input value="0" type="Number" min="0" max="10000" step="1"> minutes</div>
            <div style="margin: 20px 5px">End Epoch <input value="1440" type="Number" min="0" max="10000" step="1"> minutes</div>
            <div style="margin: 20px 5px">Time Step <input value="5" type="Number" min="1" max="120" step="1"> minutes</div>
            <div style="margin: 20px 5px">FPS <input value="30" type="Number" min="15" max="60" step="1"></div>
            <div style="margin: 20px 5px">Repeat <input type="checkbox"></div>
            <div><select id="res-select">
                <option value="full">Full Screen</option>
                <option value="1920x1080">1080p</option>
                <option value="1280x720">720p</option>
                <option value="852x480">480p</option>
                <option value="320x240">240p</option>
                <option value="852x852">Square Hi</option>
                <option value="480x480">Square Low</option>
            </select></div>
            <div class="panel-button hoverable noselect" onclick="mainWindow.startRecord(this)" style="font-size: 1.5em; padding: 14px 4px;" class="panel-button hoverable noselect">Record</div>
            <!-- <div class="panel-button hoverable noselect" style="font-size: 1.5em; padding: 14px 4px;" onclick="addKeyFrame()" style="font-size: 1.5em; padding: 2px 4px;" class="panel-button hoverable noselect">Key Frame</div> -->
        
        </div>
        <div>
            <div class="title-text">Visualization</div>
            <div style="margin: 20px 5px">Data Points <input style="width: 4em;" value="200" type="Number"></div>
            <div style="margin: 20px 5px">Name Size <input style="width: 4em;" value="4" type="Number"></div>
             <!-- <div style="margin: 20px 5px">Angle Markers<input type="checkbox" checked></div> -->
            <div style="font-size: 1.5em; padding: 14px 4px;"  id="data-button" class="panel-button hoverable noselect">Data</div>
            <div style="font-size: 1.5em; padding: 14px 4px;"  id="confirm-option-button" class="panel-button hoverable noselect">Confirm</div>
            <div style="font-size: 1.5em; padding: 14px 4px;"  onclick="closeAll()" class="close-button panel-button hoverable noselect">Cancel</div>
            <div style="font-size: 1.5em; padding: 14px 4px;" id="export-option-button" class="panel-button hoverable noselect">Export</div>
        <label style="display: block; font-size: 1.5em; padding: 14px 4px;" class="panel-button hoverable noselect" for="upload-options-button">Import</div><input style="display: none;" id="upload-options-button" type="file" accept=".sas">
    </div>
    <svg id="add-satellite"  onclick=openPanel(this) stroke-width="10px" fill="white" viewBox="-10 0 531.996 511.996">
        <g>
            <g>
                <path stroke="black" d="M283.608,442.979h-55.216h-37.647v3.216c0,30.451,25.373,55.764,55.824,55.764h18.86
                    c30.453,0,55.826-25.313,55.826-55.764v-3.216H283.608z"/>
            </g>
        </g>
        
        <g>
            <g id="main-body">
                <path  stroke="black"  d="M492.669,228.39H383.253c-10.397,0-19.332,8.358-19.332,18.753v55.286h-21.333v-78.167
                    c0-10.396-8.402-18.461-18.797-18.461h-11.32v-29.43c0-0.053,0.26-0.104,0.259-0.157c29.254-10.757,55.532-29.619,74.793-54.744
                    l19.947-25.931c4.361-5.686,5.148-13.36,1.975-19.787c-3.172-6.428-9.682-10.5-16.847-10.5H274.824V28.861
                    c0-10.396-8.428-18.823-18.824-18.823c-10.396,0-18.824,8.428-18.824,18.823v36.392H119.403c-7.165,0-13.71,4.073-16.881,10.5
                    c-3.17,6.426-2.417,14.098,1.943,19.785l19.88,25.933c19.261,25.124,45.673,43.987,74.925,54.744c0,0.054,0.26,0.105,0.26,0.158
                    v29.43h-11.32c-10.396,0-18.797,8.065-18.797,18.461v78.167h-21.333v-55.286c0-10.396-8.935-18.753-19.331-18.753H19.331
                    C8.935,228.39,0,236.748,0,247.144v148.218c0,10.397,8.935,18.755,19.331,18.755h109.416c10.396,0,19.331-8.358,19.331-18.753
                    v-55.286h21.333v71.487c0,5.923,2.728,11.22,7.004,14.67c3.229,2.608,7.32,4.196,11.794,4.196h135.581
                    c4.474,0,8.565-1.589,11.794-4.196c4.276-3.45,7.004-8.748,7.004-14.67v-71.487h21.333v55.286
                    c0,10.396,8.935,18.753,19.331,18.753h109.416c10.396,0,19.331-8.358,19.331-18.753V247.144
                    C512,236.748,503.065,228.39,492.669,228.39z M110.431,363.92H37.647v-30.118h72.784V363.92z M110.431,308.704H37.647v-30.118
                    h72.784V308.704z M474.353,363.92h-72.784v-30.118h72.784V363.92z M474.353,308.704h-72.784v-30.118h72.784V308.704z"/>
            </g>
        </g>
        <g>
            <g>
                <polygon id="plus-sign" stroke="black" fill="black" points="200,310 245.5,310 245.5,264.5 265.6,264.5 265.5,310 311,310 311,330 265.6,330 265.6,375.5 245.6,375.5 245.6,330 200,330" />
            </g>
        </g>
    </svg>
    <div onclick=openPanel(this) id="options" class="noselect hoverable side-button" title="Add Satellite">
        Options
    </div>
    <div onclick=openPanel(this) id="burns" class="noselect hoverable side-button" title="Add Satellite">
        Burns
    </div>
    <div onclick=openPanel(this) id="instructions" class="noselect hoverable side-button" title="Add Satellite">
        ?
    </div>
    <div id="instructions-panel" class="hidden panel">
        <div>
            <div style="font-size:2em; margin: 4%; font-weight: bold">Instructions</div>
            <ul>
                <li>
                    Building a plan
                    <ul>
                        <li>Add Satellite with + button in bottom right</li>
                        <li>By default, all burns are computed with finite accelerations</li>
                        <li>To insert a burn, click and hold current satellite position, use slider to change shown time
                        </li>
                        <li>Burn planning options
                            <ul>
                                <li>Click and drag to manually choose burn direction</li>
                                <li>Switch to waypoint above the burns button, and choose waypoint with mouse (defaults to 2 hrs TOF)</li>
                                <li>Open burns panel and manually insert RIC coordinate and TOF</li>
                            </ul>
                        </li>
                        <li>Burns can be deleted by cntrl-clicking on the burn point</li>
                        <li>Limitations
                            <ul>
                                <li>Burns durations are limited to 6 hours for mathematical stability</li>
                                <li>Burns are limited to once every 30 minutes</li>
                                <li>Clohessy-Wiltshire assumptions are utilized, therefore an error of ~5% can be expected compared to full physics</li>
                            </ul>
                        </li>
                    </ul>
                </li>
                <li>Spacebar changes current view</li>
                <li>GIF Generation
                    <ul>
                        <li>Select options panel</li>
                        <li>Set start time and end time (in minutes from start of scenario)</li>
                        <li>Select time step per frame (assuming 30 FPS, so if time step is 1 minute, each hour will be 2 seconds long in video)</li>
                        <li>Press record</li>
                    </ul>
                </li>
            </ul>
            <div onclick="closeAll()" class="close-button panel-button hoverable noselect">Close</div>
        </div>
    </div>
    <div id="data-panel" class="hidden panel">
        <div>
            <select onchange="dataChange(this)" id="data-select" style="font-size: 2em">
            </select>
        </div>
        <div>
            <div><input id="range" type="checkbox">Range</div>
            <div><input id="rangeRate" type="checkbox">Range Rate</div>
            <div><input id="relativeVelocity" type="checkbox">Relative Velocity</div>
            <div><input id="poca" type="checkbox">POCA</div>
            <div><input id="sunAngle" type="checkbox">CATS</div>
            <div>Position X: <input style="width: 3em;" type="Number" value="1">% Y: <input style="width: 3em;" type="Number" value="10">%</div>
            <div>Font Size <input style="width: 4em;" type="Number" value="30"></div>
            <div id="confirm-data-button" class="panel-button hoverable noselect">Confirm</div>
            <div><input id="kinematic" type="checkbox">Kinematic Reach Distance: <input style="width: 3em;" type="Number" value="10"> km TOF: <input style="width: 3em;" type="Number" value="1"> hr(s)</div>
        </div>
    </div>
    <!-- <svg viewBox="0 0 500 500" id="burn-type-control">
        <defs></defs>
        <rect x="226.252" y="13.817" width="65.63" height="265.976" style="fill: rgb(28, 17, 117);"></rect>
        <rect x="203.8" y="94.128" width="113.99" height="104.491" style="fill: rgb(72, 72, 72);"></rect>
        <path d="M 253.886 158.387 L 282.745 208.371 L 225.028 208.371 L 253.886 158.387 Z" style="fill: rgb(72, 72, 72);" transform="matrix(-0.876461, -0.481472, 0.481472, -0.876461, 334.017975, 431.888824)" bx:shape="triangle 225.028 158.387 57.717 49.984 0.5 0 1@c2643af6"></path>
        <path stroke="rgb(255,0,0)" stroke-width="0" d="M 158.687 118.532 C 163.728 117.508 172.569 117.53 177.686 118.532 C 181.772 119.332 185.258 120.253 187.617 122.85 C 190.173 125.664 191.891 132.396 191.934 135.371 C 191.963 137.329 190.188 137.711 190.207 139.689 C 190.237 142.732 194.665 148.684 194.525 152.642 C 194.398 156.251 192.848 160.097 190.207 162.573 C 187.251 165.345 182.324 166.79 176.822 167.755 C 169.855 168.977 157.239 168.951 150.915 167.755 C 146.454 166.911 143.343 166.033 140.984 163.437 C 139.921 162.267 138.926 160.808 138.156 159.127 C 138.09 159.124 138.026 159.122 137.962 159.119 C 134.244 158.947 130.39 157.398 128.031 154.801 C 125.474 151.987 123.593 146.149 123.713 142.28 C 123.825 138.71 125.656 134.724 128.031 132.349 C 130.406 129.974 134.244 128.203 137.962 128.031 C 139.95 127.939 142.539 128.239 145.045 128.889 C 146.502 126.346 147.946 124.208 149.188 122.85 C 152.175 119.587 154.721 119.337 158.687 118.532 Z" style="stroke: rgb(129, 151, 57); stroke-width: 2px; fill: rgb(204, 209, 48);"></path>
        <path stroke="rgb(255,0,0)" stroke-width="0" d="M 156.097 128.031 C 162.421 126.953 175.68 127.579 182.003 128.895 C 186.464 129.823 189.575 130.616 191.934 133.212 C 194.491 136.027 196.529 141.79 196.252 145.734 C 195.985 149.547 193.281 153.996 190.639 156.528 C 188.154 158.91 185.469 159.997 181.14 160.846 C 174.911 162.068 161.557 162.043 155.233 160.846 C 150.772 160.002 147.661 159.125 145.302 156.528 C 142.745 153.714 140.816 148.065 140.984 144.007 C 141.151 140.009 143.505 135.022 146.166 132.349 C 148.657 129.846 151.636 128.791 156.097 128.031 Z" style="stroke: rgb(129, 151, 57); stroke-width: 2px; fill: rgb(209, 120, 48);"></path>
        <path stroke="rgb(255,0,0)" stroke-width="0" d="M 166.459 129.758 C 171.19 129.458 179.799 130.942 183.299 134.076 C 186.438 136.887 187.737 142.728 187.617 146.598 C 187.505 150.167 186.19 154.178 183.299 156.528 C 179.805 159.369 171.19 161.146 166.459 160.846 C 162.545 160.598 158.887 159.125 156.528 156.528 C 153.972 153.714 152.09 147.876 152.211 144.007 C 152.322 140.437 154.154 136.451 156.528 134.076 C 158.903 131.701 162.545 130.006 166.459 129.758 Z" style="stroke: rgb(129, 151, 57); stroke-width: 2px; fill: rgb(209, 48, 48);"></path>
        <path d="M 330.743 141.805 H 396.097 L 396.097 126.805 L 436.097 146.805 L 396.097 166.805 L 396.097 151.805 H 330.743 V 141.805 Z" style="" bx:shape="arrow 330.743 126.805 105.354 40 10 40 0 1@ce8a271d"></path>
        <circle cx="468.048" cy="148.532" r="24.44"></circle>
        <path d="M 254.749 157.168 L 286.159 211.572 L 223.339 211.572 L 254.749 157.168 Z" style="fill: rgb(73, 73, 73);" transform="matrix(0.866025, -0.5, 0.5, 0.866025, -112.674866, 103.204071)" bx:shape="triangle 223.339 157.168 62.82 54.404 0.5 0 1@66c6d631"></path>
      </svg> -->
      <svg id="burn-type-control" viewBox="-400 0 1400 840" preserveAspectRatio="xMinYMin meet" onclick="changeBurnType()">
        <g>
            <rect id="svgEditorBackground" x="0" y="0" width="1380" height="840" style="fill: none; stroke: none;"/>
            <rect id="solar-panels" x="256.630000" y="37.315500" style="fill-opacity: 0.45; fill:#32328F;stroke:black;stroke-width:1px;" id="e3_rectangle" width="171.389000" height="670.604000" transform="matrix(0.581999 0 0 1.15907 124.768 -14.0137)"/>
            <path d="M-7.034483,-2.344828l8,-2v8l-8,-2Z" style="fill:white; stroke:black; stroke-width:0.5px;" id="e9_shape" transform="matrix(-14.4484 0 0 -14.4484 171.388 428.47)"/>
            <path d="M-5.151774-3.285313l-2,2v4l2,2h4l2-2v-4l-2-2Z" style="fill:white; stroke:black; stroke-width:0.5px;" id="e10_shape" transform="matrix(34.6686 0 0 34.6686 425.389 404.938)"/>
            <g style="fill-opacity: 0.5;">
                <circle id="e10_circle" cx="117.580000" cy="433.452000" style="fill:orange;stroke:black;stroke-width:0px;" r="56.736000" transform="matrix(0.298287 0 0 0.298287 113.397 269.283)"/>
                <circle id="e2_circle" cx="110.899000" cy="516.966000" style="fill:orange;stroke:black;stroke-width:0px;" r="56.736000" transform="matrix(0.298287 0 0 0.298287 113.397 269.283)"/>
                <circle id="e1_circle" cx="107.558000" cy="587.117000" style="fill:orange;stroke:black;stroke-width:0px;" r="56.736000" transform="matrix(0.298287 0 0 0.298287 113.397 269.283)"/>
                <circle id="e3_circle" cx="100.877000" cy="650.587000" style="fill:orange;stroke:black;stroke-width:0px;" r="56.736000" transform="matrix(0.298287 0 0 0.298287 113.397 269.283)"/>
                <circle id="e4_circle" cx="50.768800" cy="590.458000" style="fill:orange;stroke:black;stroke-width:0px;" r="56.736000" transform="matrix(0.298287 0 0 0.298287 113.397 269.283)"/>
                <circle id="e5_circle" cx="37.406700" cy="540.350000" style="fill:orange;stroke:black;stroke-width:0px;" r="56.736000" transform="matrix(0.298287 0 0 0.298287 113.397 269.283)"/>
                <circle id="e6_circle" cx="64.131100" cy="480.220000" style="fill:orange;stroke:black;stroke-width:0px;" r="56.736000" transform="matrix(0.298287 0 0 0.298287 113.397 269.283)"/>
                <circle id="e7_circle" cx="0.6605443953179702" cy="550.371000" style="fill:orange;stroke:black;stroke-width:0px;" r="56.736000" transform="matrix(0.298287 0 0 0.298287 113.397 269.283)"/>
                <circle id="e8_circle" cx="80.833600" cy="513.625000" style="fill:gold;stroke:black;stroke-width:0px;" r="56.736000" transform="matrix(0.298287 0 0 0.298287 113.397 269.283)"/>
                <circle id="e9_circle" cx="64.130900" cy="573.755000" style="fill:gold;stroke:black;stroke-width:0px;" r="56.736000" transform="matrix(0.298287 0 0 0.298287 113.397 269.283)"/>
            </g>
            </g>
        <g id="manual-arrows" style="fill-opacity: 0; stroke-opacity: 0">
            <path d="M2.975831,3.090257l1.5625,-1.25h-1.25a8,8,0,0,0,-6,-6.25a2,2,0,0,1,-0.625,3.125a4.6,4.6,0,0,1,5.875,3.125h-1.25Z" style="fill:#0D0C07; stroke:black; stroke-width:1px;" id="e12_shape" transform="matrix(29.6152 -29.6152 29.6152 29.6152 330.072 133.607)"/>
            <path d="M4.403322,14.034358l1.5625-1.25h-1.25a8,8,0,0,0,-6-6.25a2,2,0,0,1,-0.625,3.125a4.6,4.6,0,0,1,5.875,3.125h-1.25Z" style="fill:#0D0C07; stroke:black; stroke-width:1px;" id="e11_shape" transform="matrix(-29.6152 29.6152 -29.6152 -29.6152 696.956 983.484)"/>
        </g>
        <g id="way-arrows" style="fill-opacity: 1; stroke-opacity: 0">
            <path d="M9.114,-1.899v-1.291l6.431,3.393l-6.43,2.785v-1.19h-13.115v-3.797Z" style="fill:#000000; stroke:black; stroke-width:1px;" id="e14_shape" transform="matrix(9.83986 0 0 9.83986 507.687 426.975)"/>    
            <circle id="e15_circle" cx="761.281000" cy="424.483000" style="fill:#000000;stroke:black;stroke-width:1px;" r="84.656000"/>
            <circle id="e11_circle" cx="933.664000" cy="411.159000" style="fill:#FFFFFF;stroke:black;stroke-width:1px;" r="84.656000" transform="matrix(0.728302 0 0 0.728302 81.0419 124.787)"/>
            <circle id="e12_circle" cx="1200.070000" cy="473.495000" style="fill:#000000;stroke:black;stroke-width:1px;" r="84.656000" transform="matrix(0.535778 0 0 0.535778 119.055 169.549)"/>
            <circle id="e13_circle" cx="945.902000" cy="414.958000" style="fill:#FFFFFF;stroke:black;stroke-width:1px;" r="84.656000" transform="matrix(0.354273 0 0 0.354273 427.419 275.732)"/>
            <circle id="e14_circle" cx="361.363000" cy="884.913000" style="fill:#000000;stroke:black;stroke-width:1px;" r="84.656000" transform="matrix(0.206285 0 0 0.206285 687.734 238.95)"/>
        </g>
        </svg>
`;

document.getElementsByTagName('body')[0].innerHTML = innerH;