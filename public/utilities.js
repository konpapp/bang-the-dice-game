function scrollToBottom() {
    $('#messages').animate({ scrollTop: $('#messages').prop("scrollHeight") }, 500);
};

function buttonSounds() {
    const audio = document.getElementById('button-sound');
    audio.pause();
    audio.currentTime = 0;
    audio.play();
};

function diceSounds() {
    const audio = document.getElementById('dice-sound');
    audio.pause();
    audio.currentTime = 0;
    audio.play();
};

function msgSounds() {
    const audio = document.getElementById('msg-sound');
    audio.pause();
    audio.currentTime = 0;
    audio.play();
};

function horseSounds() {
    const audio = document.getElementById('horse-sound');
    audio.pause();
    audio.currentTime = 0;
    audio.play();
};

