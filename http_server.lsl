// Configuration Parameters
integer DEBUG = TRUE; // Verbose output
string URL = "https://api.domain.tld"; // Node-Bot Address

// Helper Variables
string localServerURL;
string remoteServerURL = URL;
key urlRequestId;
key http_request_id;

DebugMessage(string msg){ if (DEBUG) llOwnerSay(msg); }
Initialize(){
    urlRequestId = llRequestSecureURL();
    http_request_id = llHTTPRequest(remoteServerURL, [HTTP_METHOD="GET", HTTP_CUSTOM_HEADER=","], "");
}
HttpResponse(key request_id, integer status, list metadata, string body){ // Response from the registration request
    if (request_id == http_request_id) llOwnerSay(body);
}
HttpRequest(key id, string method, string body){ // Response to incoming requests
    DebugMessage("ID:\n"+(string)id + "\nMethod:\n" + method + "\nBody:\n" +body);

    llSetContentType(urlRequestId, CONTENT_TYPE_JSON);
    if (id == urlRequestId)
    {
        if (method == URL_REQUEST_DENIED) DebugMessage("Request denied:\n\n" + body);
        else if (method == URL_REQUEST_GRANTED) localServerURL = body;
    }
    if (method == "GET") {
        llHTTPResponse(id, 200, "GET <3");
    } else if (method == "POST") {
        llHTTPResponse(id, 200, "POST <3");
    }
}

default
{
    state_entry() { Initialize(); }
    on_rez(integer start_param) { llResetScript(); }
    changed(integer change) { if (change & (CHANGED_OWNER | CHANGED_INVENTORY)) llResetScript(); }
    http_response(key id, integer status, list meta, string body) { HttpResponse(id, status, meta, body);  }
    http_request(key id, string method, string body)  { HttpRequest(id, method, body); }
}