var popup_html = `
<span id="angle-domain">foo</span><button id="angle-close"></button>
<hr>
<div class="angle-content">
<div class="angle-loading-container"><div class="angle-lds-ring"><div></div><div></div><div></div><div></div></div></div>
</div>
<button class="angle-button" id="angle-stop">Never show for this site again</button>
`

var loaded_html = `
<span class="angle-section-title">Bias:</span> <span id="bias-rating"></span><br/>
<input type="range" min="-1" max="1" step="0.03" id="bias-slider" class="angle-slider">
<br/>
<span class="angle-section-title">Reliability:</span> <span id="reliability-rating"></span><br/>
<input type="range" min="-1" max="1" step="0.03" id="reliability-slider" class="angle-slider">
<button class="angle-button" id="angle-submit">Suggest score</button>
`

var failed_message = `
<p>Failed to fetch data for this website. Please try again later.</p>
`

const API_ADDRESS = "http://newsangle.tech/api/"
var changed = false;

// See if this domain is in the list of showable domains
const domain = window.location.hostname || "my.example.com"
var deny = localStorage.getItem('angle-deny') || false;
if (!deny) {
    show_popup()
} else {
    console.log("Not displaying for this domain")
}

function hide_popup() {
    var popup = $(".angle-popup");
    const fade = 300;
    popup.hide(fade);
    setTimeout(() => { $(".angle-popup").remove(); }, fade);
}

function lookup_fail(err) {
    console.error("failed to lookup for domain", domain, err)
    $('.angle-loading-container').remove()
    var error = $('<div></div>').addClass('angle-error').html(failed_message)
    $('.angle-content').append(error)
    // Close the popup automatically after a few seconds
    setTimeout(function () {
        hide_popup()
    }, 3000)
}

function submit_feedback() {
    if (!changed) return;
    $('#angle-submit').remove()
    bias = $('#bias-slider').val()
    rel = $('#reliability-slider').val()
    var addr = encodeURI(`${API_ADDRESS}feedback?domain=${domain}&bias=${bias}&reliability=${rel}`)
    fetch(addr, {method: 'POST'}).then(res => {
        if (res.status != 202) alert("Failed to send score")
        else {
            $('.angle-content').append($('<div></div>').text("Thank you for your feedback."))
        }
    })
}

function slider_change() {
    set_labels($('#bias-slider').val(), $('#reliability-slider').val())
    // Enable the submit feedback button
    $('#angle-submit').addClass('angle-submit-enabled')
    changed = true;
}

function set_labels(bias, rel) {
    let biastext, reltext;
    const highcutoff = 0.6;
    const lowcutoff = 0.2;
    if (bias < -highcutoff) biastext = "Right-leaning"
    else if (bias < -lowcutoff) biastext = "Often Right-leaning"
    else if (bias <= lowcutoff) biastext = "Often Mixed"
    else if (bias <= highcutoff) biastext = "Often Left-leaning"
    else  biastext = "Often Left"

    if (rel < -highcutoff) reltext = "Unreliable"
    else if (rel < -lowcutoff) reltext = "Often unreliable"
    else if (rel <= lowcutoff) reltext = "Mixed"
    else if (rel <= highcutoff) reltext = "Often reliable"
    else  reltext = "Reliable"

    $('#bias-rating').text(biastext)
    $('#reliability-rating').text(reltext)
}

function show_popup() {
    console.log("Loading popup...")

    // Let's create our popup and add to the DOM
    var popup = $("<div>").html(popup_html).addClass("angle-popup")
    $("body").append(popup);
    popup.hide()
    // Set all the dynamic content
    $("#angle-domain").text(domain)
    $("#angle-close").on('click', hide_popup);
    $("#angle-stop").on('click', function () {
        // Add this domain to the list of domains to never show
        localStorage.setItem('angle-deny', true)
        hide_popup()
    })

    // Cool animation time
    popup.show(600)

    // We should now go fetch the data from our database
    setTimeout(function () {
        var addr = encodeURI(API_ADDRESS + "lookup?domain=" + domain)
        fetch(addr, {
            // mode: 'no-cors',
            // method: 'GET',
        }).then(res => {
            console.log(res.status)
            res.json().then(j => {
                console.debug("Got data for domain", j)
                $('.angle-loading-container').remove()
                $('.angle-content').html(loaded_html)
                let bias = j["bias"]
                let rel = j["reliability"]
                $('#bias-slider').val(bias)
                $('#reliability-slider').val(rel)
                set_labels(bias, rel)
                $('input[type=range]').on('input', slider_change)
                $('#angle-submit').on('click', submit_feedback)
            }).catch(lookup_fail)
        }).catch(lookup_fail)
    }, 2300)
}

