// var slider = document.getElementById("myRange");
// var output = document.getElementById("demo");
// output.innerHTML = slider.value; // Display the default slider value

// // Update the current slider value (each time you drag the slider handle)
// slider.oninput = function() {
  // output.innerHTML = this.value;
// }

function foo() {
  var output = $('#demo')
  $('#bias').on('input', function() {
    $('#bias-value').text(this.value);
  })
  $('#reliability').on('input', function() {
    $('#reliability-value').text(this.value);
  })
}

$(foo)
