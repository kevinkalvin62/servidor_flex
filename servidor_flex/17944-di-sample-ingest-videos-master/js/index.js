var BCLS = (function(window, document) {
  var // CMS API stuff
    account_id_display = document.getElementById("account_id"),
    account_id,
    client_id_display = document.getElementById("client_id"),
    client_id,
    client_secret_display = document.getElementById("client_secret"),
    client_secret,
    ingest_profile_display = document.getElementById("ingest_profile_display"),
    ingest_profile,
    custom_profile_display = document.getElementById("custom_profile_display"),
    cms_url_display = document.getElementById("cms_url"),
    cms_url = "https://cms.api.brightcove.com/v1/accounts/",
    videoDataDisplay = document.getElementById("videoData"),
    // Dynamic Ingest API stuff
    profilesArray = ['high-resolution', 'screencast-1280', 'single-rendition', 'single-bitrate-high', 'audio-only', 'videocloud-default-v1', 'single-bitrate-standard'],
    di_url_display = document.getElementById("di_url"),
    di_submit_display = document.getElementById("di_Submit"),
    proxyURL = "https://solutions.brightcove.com/bcls/bcls-proxy/brightcove-learning-proxy-v2.php",
    di_url = 'https://ingest.api.brightcove.com/v1/accounts/',
    response_display = document.getElementById("response"),
    videoData = [],
    requestBody = {},
    totalVideos,
    videoNumber = 0,
    currentJobs = 0,
    t1,
    t2,
    totalIngested = 0,
    defaults = {
      account_id: '57838016001'
    },
    callbacks = '["http://solutions.brightcove.com/bcls/di-api/di-callbacks.php"]';

  // is defined
  function isDefined(x) {
    if (x === "" || x === null || x === undefined) {
      return false;
    } else {
      return true;
    }
  }
  // set options for the CMS API request
  function setCMSOptions() {
    var options = {};
    // truncate description if too long
    videoData[videoNumber].description = videoData[videoNumber].description.substr(0, 120) + "...";
    if (isDefined(client_id) && isDefined(client_secret)) {
      options.client_id = client_id;
      options.client_secret = client_secret;
    }
    options.account_id = account_id;
    options.proxyURL = proxyURL;
    requestBody.name = videoData[videoNumber].name;
    requestBody.description = videoData[videoNumber].description;
    requestBody.reference_id = videoData[videoNumber].reference_id;
    requestBody.tags = videoData[videoNumber].tags;
    options.requestBody = JSON.stringify(requestBody);
    options.requestType = "POST";
    options.url = cms_url_display.value;
    // now submit the request
    makeRequest(options, function(response) {
      if (response.indexOf("TIMEOUT") > 0) {
        // videoNumber++;
        t1 = setTimeout(setCMSOptions, 1000);
      } else {
        response = JSON.parse(response);
        di_url_display.value = di_url + account_id + "/videos/" + response.id + "/ingest-requests";
        setDIOptions();
      }
    });
  }
  // set options for the Dynamic Ingest API request
  function setDIOptions() {
    var options = {},
      requestBody = {},
      custom_profile_display_value = custom_profile_display.value;
    // get the ingest profile
    if (isDefined(custom_profile_display_value)) {
      ingest_profile = custom_profile_display_value;
    } else {
      ingest_profile = ingest_profile_display.options[ingest_profile_display.selectedIndex].value;
    }
    if (isDefined(client_id) && isDefined(client_secret)) {
      options.client_id = client_id;
      options.client_secret = client_secret;
    }
    options.account_id = account_id;
    options.proxyURL = proxyURL;
    requestBody.master = {};
    requestBody.master.url = videoData[videoNumber].url;
    requestBody.profile = ingest_profile;
    requestBody.callbacks = [];
    requestBody.callbacks.push(callbacks);
    options.requestBody = JSON.stringify(requestBody);
    options.requestType = "POST";
    options.url = di_url_display.value;
    // now submit the request
    makeRequest(options, function(response) {
      response = JSON.parse(response);
      totalIngested++;
      logResponse("totalIngested", totalIngested);
      if (videoNumber < totalVideos - 1) {
        videoNumber++;
        currentJobs++;
        logResponse('Processing video number', videoNumber + 1);
        logResponse('Current jobs: ', currentJobs + 1);
        // if currentJobs is > 99, need to pause
        if (currentJobs > 99) {
          // reset currentJobs
          currentJobs = 0;
          // wait 30 min before resuming
          t2 = setTimeout(setCMSOptions, 1800000);
        } else {
          // pause to avoid CMS API timeouts
          t2 = setTimeout(setCMSOptions, 1000);
        }
      }
    });
  }
  // function to set the request
  function logResponse(type, data) {
    response_display.textContent += type + ": " + data + ",\n";
  }

  /**
   * send API request to the proxy
   * @param  {Object} options for the request
   * @param  {String} options.url the full API request URL
   * @param  {String="GET","POST","PATCH","PUT","DELETE"} requestData [options.requestType="GET"] HTTP type for the request
   * @param  {String} options.proxyURL proxyURL to send the request to
   * @param  {String} options.client_id client id for the account (default is in the proxy)
   * @param  {String} options.client_secret client secret for the account (default is in the proxy)
   * @param  {JSON} [options.requestBody] Data to be sent in the request body in the form of a JSON string
   * @param  {Function} [callback] callback function that will process the response
   */
  function makeRequest(options, callback) {
    var httpRequest = new XMLHttpRequest(),
      response,
      proxyURL = options.proxyURL,
      // response handler
      getResponse = function() {
        try {
          if (httpRequest.readyState === 4) {
            if (httpRequest.status >= 200 && httpRequest.status < 300) {
              response = httpRequest.responseText;
              // some API requests return '{null}' for empty responses - breaks JSON.parse
              if (response === '{null}') {
                response = null;
              }
              // return the response
              callback(response);
            } else {
              alert('There was a problem with the request. Request returned ' + httpRequest.status);
            }
          }
        } catch (e) {
          alert('Caught Exception: ' + e);
        }
      };
    /**
     * set up request data
     * the proxy used here takes the following request body:
     * JSON.stringify(options)
     */
    // set response handler
    httpRequest.onreadystatechange = getResponse;
    // open the request
    httpRequest.open('POST', proxyURL);
    // set headers if there is a set header line, remove it
    // open and send request
    httpRequest.send(JSON.stringify(options));
  }

  di_submit_display.addEventListener("click", function() {
    var i, now = new Date();
    videoData = JSON.parse(videoDataDisplay.value);
    totalVideos = videoData.length;
    // to insure uniqueness,
    for (i = 0; i < totalVideos; i++) {
      videoData[i].reference_id += "_" + now.toISOString();
    }
    // in case of stop/start, reset videoNumber to 0
    videoNumber = 0;
    // get account inputs
    account_id = isDefined(account_id_display.value) ? account_id_display.value : defaults.account_id;
    client_id = isDefined(client_id_display.value) ? client_id_display.value : null;
    client_secret = isDefined(client_secret_display.value) ? client_secret_display.value : null;
    cms_url_display.value = cms_url + account_id + "/videos";
    // set CMS API options for first video
    setCMSOptions();
  });
  // initialize
  function init() {
    var i,
      iMax = profilesArray.length,
      newOpt;
    // add options for standard ingest profiles
    for (i = 0; i < iMax; i++) {
      newOpt = new Option(profilesArray[i]);
      ingest_profile_display.add(newOpt);
    }
  }
  // call init to set things up
  init();
})(window, document);