initFontAwesome();

var project_members_dropdown = _.template("<div class=\"lightbox owner top above_scrim standard add_owner\" id=\"tk-members-dropdown\"><article class=\"content\"><label><input type=\"text\" class=\"std search\"></label><ul><% _.each(members, function(member) { %> <li><a data-person-id=\"<%=member.id%>\" class=\"tk-assign-owner\"><span><span class=\"name\"><%=member.name%></span><span class=\"initials\"><%=member.initials%></span></span></a></li><% }); %></ul></article></div>");

var csrf = $("meta[name='csrf-token']").attr('content');
var project_id = window.location.pathname.match(/^\/n\/projects\/([0-9]+)\/?$/)[1];
var owner_id = 0;

// Initialize font-awesome
// source: http://stackoverflow.com/questions/4535816/how-to-use-font-face-on-a-chrome-extension-in-a-content-script
var fa = document.createElement('style');
fa.type = 'text/css';
fa.textContent = '@font-face { font-family: FontAwesome; src: url("'+ chrome.extension.getURL('lib/fa/fonts/fontawesome-webfont.woff?v=4.0.3')+ '"); }';

// Add the "Assign Members" button to the selected stories control bar
$("body").on("click", ".story.item .selector:not(.selected)", function() {
	if ( !!!$("#tk-members-button").length ) {
	  setTimeout( function() {
	  	$(".selected_stories_controls button.move").after('<button type="button" id="tk-members-button" title="Assign members to selected stories"><i class="fa fa-user-plus"></i></button>');
	  }, 10 );
	}
});

// Render the project members dropdown menu
$("body").on("click", "#tk-members-button", function(e) {
	e.preventDefault();

	$.ajax('/services/v5/projects/' + project_id + '/memberships', {
		'type':'GET', 
		beforeSend:function(xhr){
			xhr.setRequestHeader('X-CSRF-Token', csrf);
		}
	}).done(function(data){
		var members = _.pluck(data, "person");
		
		$(".lightbox.wrapper").clone().appendTo("#root").attr('id', 'tk-lightbox').html(project_members_dropdown({members:members}));

		var top = $("#tk-members-button").outerHeight() + $("#tk-members-button").offset().top + 7;
		var left = $("#tk-members-button").outerWidth() + $("#tk-members-button").offset().left - $("#tk-members-dropdown").outerWidth() + 5;

		$("#tk-members-dropdown").css({top:top, left:left}).parent().show();
	});

	return false;
});

// Search through members dropdown, dynamically hide/show results
$("body").on("keyup", "#tk-members-dropdown input", function() {
	var val = $.trim($(this).val()).replace(/ +/g, ' ').toLowerCase();

	$("#tk-members-dropdown li").show().filter(function() {
        var text = $(this).text().replace(/\s+/g, ' ').toLowerCase();
        return !~text.indexOf(val);
    }).hide();
});

// Implement members list hover state
$("body").on("mouseenter mouseleave", "#tk-members-dropdown li", function() {
	$(this).toggleClass("selected");
});

// Close the members list when clicking outside of it
$("body").on('click', '#tk-lightbox', function(e) {
  if (e.target !== this) {
    return;
  } else {
  	$("#tk-lightbox").remove();
  }
});

// Close the members list when hitting 'escape'
$(document).on('keyup', function(e){
  if (e.keyCode === 27 && !!$("#tk-lightbox")) {
  	$("#tk-lightbox").remove();
  }
});

// Mass assign member to selected cards
$("body").on("click", ".tk-assign-owner", function(e) {
	e.preventDefault();

	var owner_id = $(this).data('person-id');
	var stories = _.toArray($(".story.item .selector.selected").closest(".story.item"));
	var story_ids = _.chain(stories)
										.pluck("attributes")
										.pluck("data-id")
										.pluck("value")
										.unique()
										.value()
										.map(function(story_id){
											return parseInt(story_id);
										});

	if ( story_ids.length > 0 ) {
		_.each(story_ids, function(story_id) {
			// Get the selected story's current owner's
			$.ajax('/services/v5/projects/' + project_id + '/stories/' + story_id, {
				'type':'GET', 
				beforeSend:function(xhr){
					xhr.setRequestHeader('X-CSRF-Token', csrf);
				}
			}).done(function(data){
				// Add user id to current owners list
				var payload = {"owner_ids":_.union(data.owner_ids, [owner_id])};

				// Update story
				$.ajax('/services/v5/projects/' + project_id + '/stories/' + story_id, {
					'type':'PUT',
					'data':JSON.stringify(payload),
					'processData':false,
					'contentType':'application/json',
					beforeSend:function(xhr){
						xhr.setRequestHeader('X-CSRF-Token', csrf);
					}
				});
			});
		});
	}

	// Close members dropdown
	$("#tk-lightbox").remove();

	// Deselect all stories
	$("button.deselect_all").click();

	return false;
});

// Initialize FontAwesome
// source: http://stackoverflow.com/questions/4535816/how-to-use-font-face-on-a-chrome-extension-in-a-content-script
function initFontAwesome() {
	var fa = document.createElement('style');
	fa.type = 'text/css';
	fa.textContent = '@font-face { font-family: FontAwesome; src: url("'+ chrome.extension.getURL('lib/fa/fonts/fontawesome-webfont.woff?v=4.0.3')+ '"); }';

	document.head.appendChild(fa);
}