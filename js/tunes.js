$(function() {


  //Get and display most recent track
  scrobbleScribble("kyds3k");
  //Update track every 30 seconds (please please don't go over rate!)
  let scrobGoblin = setInterval(function() {
    scrobbleScribble("kyds3k");
  }, 30000);

  typeOut(".audio-selection", "Current audio selection:", 250);

  // Track "EQ" display
  let eqLines = document.getElementsByClassName("eq-line");
  let eqCount = eqLines.length;

  let bars = setInterval(function() {
    for (let i = 0; i < eqCount; i++) {
      let eqVar = randomIntFromInterval(10, 100);
      eqLines[i].style.height = eqVar + "%";
    }
  }, 100);

  // Theme changer
  // Also updates song (just for demo purposes)
  $(".album-image img").click(function() {
    let newClass = $("body").hasClass("blue") ? "green" : "blue";
    $("body")
      .removeClass()
      .addClass(newClass);
  });
});

//Get and render scrobbled info
function scrobbleScribble(id) {
  let tracks = getTracks(id);
  tracks.then(res => {
    let currentArtist = $(".current-artist").html();
    let currentTrack = $(".current-track").html();
    let newImage = res.recenttracks.track[0].image[2]["#text"];
    let newArtist = res.recenttracks.track[0].artist.name;
    let newTrack = res.recenttracks.track[0].name;
    let newAlbum = res.recenttracks.track[0].album["#text"];

    let artistSlug = newArtist.replace(/\s/g, "+");
    let trackSlug = newTrack.replace(/\s/g, "+");
    let trackSlugEncoded = encodeURI(trackSlug);

    //Type out track name
    let trackType = new TypeIt(".current-track", {
      strings: `<a href="https://www.last.fm/music/${artistSlug}/_/${trackSlugEncoded}" target="_blank">${newTrack}</a>`,
      speed: 50,
      waitUntilVisible: false,
      startDelay: 1200,
      // Hides blinking cursor after typing is done
      afterComplete: instance => {
        $(".current-track")
          .find(".ti-cursor")
          .addClass("is-hidden");
        artistType.go();
      }
    });

    //Type out artist name
    let artistType = new TypeIt(".current-artist", {
      strings: `<a href="https://www.last.fm/music/${artistSlug}" target="_blank">${newArtist}</a>`,
      speed: 50,
      waitUntilVisible: false,
      afterComplete: instance => {
        $(".current-artist")
          .find(".ti-cursor")
          .addClass("is-hidden");
      }
    });

    //Override default Last.fm generic image with cool cassette gif
    if (
      newImage ===
        "https://lastfm.freetls.fastly.net/i/u/174s/2a96cbd8b46e442fc41c2b86b821562f.png" ||
      newImage === ""
    ) {
      newImage = "images/cassette-smaller.gif";
    }

    //Update album image
    $(".album-image img")
      .attr("src", newImage)
      .attr("alt", newArtist + " - " + newTrack);
    trackType.go();
  });
}

// Last.fm scrobbling
async function getTracks(id) {
  try {
    let response = await fetch(
      `https://ws.audioscrobbler.com/2.0?method=user.getRecentTracks&limit=1&user=${id}&api_key=70d032701f2e8602243e3915d6d25980&&format=json&extended=1`
    );
    return await response.json();
  } catch (err) {
    $(".current-artist").html("An error occurred.");
  }
}

//Typing function
function typeOut(target, string, delay) {
  new TypeIt(target, {
    strings: string,
    speed: 50,
    startDelay: delay,
    waitUntilVisible: true,
    afterComplete: instance => {
      $(target)
        .find(".ti-cursor")
        .addClass("is-hidden");
    }
  }).go();
}

//Random number for EQ bars
function randomIntFromInterval(min, max) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}
