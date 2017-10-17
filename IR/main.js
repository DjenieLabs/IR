define(['HubLink', 'Easy', 'PropertiesPanel', 'RIB'], function(Hub, easy, Ppanel, RIB){
  var inputs = ["CODE"];
  var actions = ['SEND_RAW'];

  var IR = {};
  var _stopLoading = false;

  // Extract the name from the codes
  function getCodeList(){
    var list = [];
    for(var action of this.codeList){
      if(action.message){   // Only show items with stored codes
        if(action.message.code !== 0){
          list.push(action.name.toLowerCase());
        }
      }
    }

    return list;
  }

  IR.getActions = function() {
    return actions.concat(getCodeList.call(this));
  };

  IR.getDefaultAction = function() {
    var newActions = getCodeList.call(this);
    if ( newActions.length > 0 ) {
      return newActions[0];
    }
    return false;
  };

  IR.getInputs = function() {
    var newInputs = getCodeList.call(this);
    return inputs.concat(newInputs);
  };

  IR.getDefaultInput = function() {
    var newInputs = getCodeList.call(this);
    if ( newInputs.length > 0 ) {
      return newInputs[0];
    }
    return false;
  };

  /**
   * This method is called when the user hits the "Save"
   * recipe button. Any object you return will be stored
   * in the recipe and can be retrieved during startup (@onLoad) time.
   */
  IR.onBeforeSave = function(){
    return {codeList: this.codeList};
  };

  /**
   * Triggered when added for the first time to the side bar.
   * This script should subscribe to all the events and broadcast
   * to all its copies the data.
   * NOTE: The call is bound to the block's instance, hence 'this'
   * does not refer to this module, for that use 'IR'
   */
  IR.onLoad = function(){
    var that = this;
    // Subscribe to the hardware events

    this.addSubscription('block:change', function(data){
      // Send my data to anyone listening
      // Only send new codes, ignore REPEAT events
      if (data.message.code !== 0) {
        // Set any item that is in recording mode.
        recordCode.call(that, data);

        // Check if the event contains one of the codes
        // we are waiting for.
        preProcessCodes.call(that, data.message);
      }
    });

    
    require.config({
      baseUrl: that.basePath + 'libs/',
      catchError: true
    });

    // TODO: Remove this library when server side methods are enabled
    // Load buffer library
    var libPath = that.basePath + 'libs/';
    // Load Dependencies
    require([libPath+'buffer.js'], function(buf){
      // Make it global
      Buffer = buf.Buffer;
      console.log("Buffer lib loaded! ");
    });

    require([libPath+'protocol-decoder.js'], function(decoder){
      // Make it global
      that.controller.Decoder = decoder;
      that.controller.Decoder.controller = that;
      console.log("Decoder lib loaded! ");
    });

    // Load my properties template
    this.loadTemplate('properties.html').then(function(template){
      that.propTemplate = template;
    });

    // Load previously stored settings
    if(this.storedSettings && this.storedSettings.codeList){
      this.codeList = this.storedSettings.codeList;
    }else{
      // Stores the list of codes
      this.codeList = [];
    }

    this.lastRawData = '';

    var missing = IR.hasMissingProperties.call(this);
    if ( missing ) {
      this.displayState('warning', 'Add some IR code...');
    } else {
      this.clearState();
    }

  };

  IR.hasMissingProperties = function() {
    // var missing = this.codeList.length === 0;
    return false;
  };

  /**
   * Intercepts the properties panel closing action.
   * Return "false" to abort the action.
   * NOTE: Settings Load/Saving will atomatically
   * stop re-trying if the event propagates.
   */
  IR.onCancelProperties = function(){
    console.log("Cancelling Properties");
  };

  /**
   * Intercepts the properties panel save action.
   * You must call the save method directly for the
   * new values to be sent to hardware blocks.
   * @param settings is an object with the values
   * of the elements rendered in the interface.
   * NOTE: For the settings object to contain anything
   * you MUST have rendered the panel using standard
   * ways (easy.showBaseSettings and easy.renderCustomSettings)
   */
  IR.onSaveProperties = function(settings){
    readInterfaceItems.call(this);
    // Adding back custom settings object until implmented
    // TODO: Remove this.
    console.log("Saving settings: ", settings);
    settings.Custom = this._tmpCustomObj;

    this.settings = settings;
    this.saveSettings().catch(function(err){
      if(!err.errorCode){
        console.log(err);
      }else{
        alert("Error (make me a nice alert please): ", err.message);
      }
    });

    // Update the input list
    easy.showDataFeed(this);

    var missing = IR.hasMissingProperties.call(this);
    if ( missing ) {
      this.displayState('warning', 'Add some IR code...');
    } else {
      this.clearState();
    }

  };

  IR.onClick = function(){
    var that = this;

    // Ppanel.onSave(save.bind(this));
    // Ppanel.onClose(cancelPanel.bind(this));

    // Display animation
    Ppanel.loading("Loading settings...");
    this.loadSettings(function(settings){
      console.log("Settings: ", settings);

      // Overwrite default event modes
      settings.EventMode = {
        property: 'EventMode',
        items: [
          { name: "Always", value: 0, selected: (settings.EventMode === 0)?true:false },
          { name: "Never", value: 1, selected: (settings.EventMode === 1)?true:false }
        ]
      };

      // TODO: Removing custom object until implemented
      that._tmpCustomObj = $.extend(true, {}, settings.Custom);
      // Important: we MUST pass a Custom property
      // or Easysettings will not display the Custom Settings Menu option
      settings.Custom = {};

      // available to hardware blocks
      easy.showBaseSettings(that, settings);

      renderCustomSettings.call(that);

      easy.openCustomSettingsAccordion();

    });
  };

  /**
   * Parent is asking me to execute my logic.
   * This block only initiate processing with
   * actions from the hardware.
   * @param event is an object that contains action and data properties.
   */
  IR.onExecute = function(event) {
    console.log("Execute: ", event);
    var that = this;
    for(var item of this.codeList){
      // Only attach the code when it actually happens
      if(item.name.toLowerCase() == event.action){
        // Send Raw
        // TODO: Format original message
        console.log("Sending item.format: ", item.format, "; Item.message: ", item.message);
        this.APICall("transmitData", [item.format, item.message]).then(function(res) {
          console.log("Transmission OK?: ", res);
        }).catch(function(err){
          console.error("Error transmitting: ", err);
        });
        break;
      }
    }
  };

  /**
   * Parent is send new data (using outputs).
   */
  IR.onNewData = function(event) {
    console.log("New data: ", event);
    // This can be used to send raw infrared signals
    // using the 'SEND' action
  };

  // Converts the dom data-index into current array index
  function _getItemFromIndex(array, index){
    var res = -1;
    array.some(function(item, i){
      if(item.index == index){
        res = i;
        return true;
      }
    });

    return res;
  }

  // Removes one item from the array of codes
  function deleteItem(el){
    readInterfaceItems.call(this);
    var that = this;
    // Since indices change as we add or delete
    // elements, we MUST search for the actual item
    that.codeList.splice(_getItemFromIndex(that.codeList, $(el).attr("data-index")), 1);

    renderCustomSettings.call(this);
  }

  // Starts the flashing animation for the given dom item
  function __setRecording(item){
    item.removeClass("green")
    .removeClass("yellow")
    .addClass("red")
    .transition("set looping")
    .transition('flash', "1000ms");
  }

  // Removes Animations and clears status flag
  var __unsetRecording = function(domEl, hasCode){

    domEl.removeClass("red")
    .transition("remove looping");

    if(hasCode){
      domEl.addClass("green");
    }else{
      domEl.addClass("yellow");
    }

  };

  // Displays/Removes the cording animation
  function startRecording(el){
    var index = _getItemFromIndex(this.codeList, $(el).attr("data-index"));
    var item = this.codeList[index].DOM.find("i.record");
    var that = this;
    var hasRecordedCode = (this.codeList[index].code !== 0);

    if(this.codeList[index].recording){
      this.codeList[index].recording = false;
      __unsetRecording(item, hasRecordedCode);

    }else{
      // First we stop any other item that might be in recording mode
      this.codeList.forEach(function(x, i){
        that.codeList[i].recording = false;
        __unsetRecording(that.codeList[i].DOM.find("i.record"), (that.codeList[i].code !== 0));
      });

      this.codeList[index].recording = true;
      // Clear the previous code
      this.codeList[index].code = 0;
      __setRecording(item);

      //Show a hint
      item.popup({
        content: "Waiting an IR signal...",
        position: "left center",
      });
      item.popup('show');

    }


    // TODO: Implement me!
  }

  // Read the current interface and assign the right
  // DOM object to the array instances.
  function readInterfaceItems(){
    var arr = [];
    var that = this;
    this.myPropertiesWindow.find(".record-row").each(function(el){
      var index = _getItemFromIndex(that.codeList, $(this).attr("data-index"));
      that.codeList[index].name = $(this).find("input").val();
    });
  }

  function addNew(){
    // 1) Read the interface
    readInterfaceItems.call(this);

    // add an empty slot
    this.codeList.push({
      name: "IR-" + (this.codeList.length + 1),
      index: this.codeList.length,
      code: 0
    });

    renderCustomSettings.call(this);
  }

  function submitData(){
    recordCheck.call(this, true);
    console.log("Sending: ", this.controller._lastEvent);
    console.log("TO BE IMPLEMENTED!");
  }

  function recordCheck(send){
    var choice = this.modalWindow.find(".checkbox").hasClass("checked");
    this.controller._rememberNext = choice;
    this.controller._canSend = send === true;
  }

  function showModal(){
    if(this.modalWindow && this.controller._lastEvent){

      if(this.controller._rememberNext){
        if(this.controller._canSend){
          submitData.call(this);
        }

        return;
      }

      this.modalWindow.modal({
        inverted: true,
        transition: 'scale',
        onApprove : submitData.bind(this),
        onDeny    : recordCheck.bind(this)
      }).modal('show');
    }
  }

  function renderCustomSettings(){
    var that = this;
    easy.clearCustomSettingsPanel();

    // Compile template using current list
    this.myPropertiesWindow = $(this.propTemplate({codes: this.codeList, basePath: this.basePath}));
    // NOTE: For some reason .find(#msgModal) is not working
    this.modalWindow = $(this.myPropertiesWindow[0]);
    
    // Buttons Event handlers
    this.myPropertiesWindow.find("#btAdd").click(addNew.bind(this));
    this.myPropertiesWindow.find("#btDelete").click(function(){
      deleteItem.call(that, this);
    });

    this.myPropertiesWindow.find("#btRecord").click(function(){
      startRecording.call(that, this);
    });

    this.myPropertiesWindow.find("#senddata-btn").click(function(){
      var email = { to: 'alex.agudelo@djenie.com',
                    text: "[" +that.lastRawData.toString() + "]",
                    subject: 'IR: Protocol not implemented' };
      $.ajax({
          type: 'POST', crossDomain: true,
          url: 'http://replicatorcloud.na-inter.net/emailsender/send/',
          xhrFields: {withCredentials: false},
          data: email,
          success: function(msg) {
            console.log("email sent to: ", email);
          },
          error: function(jqXHR, status, error) {
            console.log("error sending email: ", error);
          }
      });
    });

    // Display elements
    easy.displayCustomSettings(this.myPropertiesWindow);

    // Remove modal window
    this.modalWindow.modal('hide');

    // Assign the dom element to the array items
    this.myPropertiesWindow.find(".record-row").each(function(i){
      var index = _getItemFromIndex(that.codeList, $(this).attr("data-index"));
      // Replace/Add dom element for the current item
      that.codeList[index].DOM = $(this);
      var hasCode = that.codeList[index].code !== 0;
      __unsetRecording(that.codeList[index].DOM.find("i.record"), hasCode);

      if(that.codeList[index].recording){
        __setRecording(that.codeList[index].DOM.find("i.record"));
      }
    });
  }

  // Searches in the list of
  function recordCode(blockData){
    var that = this;
    
    return this.codeList.some(function(item, index){
      if(item.recording){
        // if(!that.controller.Decoder.findPattern(blockData.message.raw).sequence){
        //   console.log("ERROR: This remote is not yet supported!");
        //   return false;
        // }

        var decoded = that.controller.Decoder.analyse(blockData.message.raw);
        if(decoded){
          item.recording = false;
          var itemDom = item.DOM.find("i.record");
          __unsetRecording(itemDom, true);

          item.message = decoded;
          item.message.raw = blockData.message.raw;
          that.lastRawData = blockData.message.raw;
          itemDom.popup('destroy');
          if(decoded.type === 'RAW'){
            that.controller._lastEvent = blockData.message;
            console.warn("This protocol is not yet implemented: ", blockData.message.raw);
            showModal.call(that);
          }
          return true;
        }
      }
    });
  }

  // Sends data to the LM and any other listener
  function dispatchEvent(evt){
    // Send data to logic maker for processing
    this.processData(evt);

    // Send data to any listener
    // Mark the other codes as disabled
    for(var input of this.getInputs()){
      if(!evt.hasOwnProperty(input)){
        evt[input.toLowerCase()] = false;
      }
    }

    // Make sure any new code is added to the properties feed
    easy.showDataFeed(this);
    
    this.dispatchDataFeed(evt);
  }

  function preProcessCodes(event){
    var that = this;
    // Decode the message
    console.log(JSON.stringify(event.raw));
    var code = that.controller.Decoder.analyse(event.raw);
    if(!code) return;
    console.log("Code: ", code.type);
    for(var item of this.codeList){
      if(event.code){
        // TODO: What is this for?
        if(item.message.code == event.code){
          event[item.name.toLowerCase()] = true;
        }
      }else if(event.raw && event.raw.length > 2){
        // Raw analysis
        if(item.message){
          var res = that.controller.Decoder.compareCodes(code, item.message);
          if(res){
            var times = res.repeat || 1;
            var trigger = function(){
              if(times-- > 0){
                event[item.name.toLowerCase()] = true;
                dispatchEvent.call(this, event);
                setTimeout(trigger.bind(this), res.timeout || 100);
              }
            };
            
            return trigger.call(this);
          }
        }
      }
    }
  }

  return IR;

});
