const player = document.getElementById("player");
const dialogue = document.getElementById("dialogue");
const boss = document.getElementById("boss");

const fieldMusic = document.getElementById("fieldMusic");
const bossMusic = document.getElementById("bossMusic");

let x = 50, y = 180;
let keys = {};
let data = 0, stab = 0;
let bossHP = 10;
let unlockedBoss = false;
let fighting = false;

document.getElementById("startBtn").onclick = () => {
    document.getElementById("start").classList.add("hidden");
    document.getElementById("game").classList.remove("hidden");
    fieldMusic.volume = 0.4;
    fieldMusic.play();
};

document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

function update() {
    if (!fighting) {
        if (keys.w) y -= 2;
        if (keys.s) y += 2;
        if (keys.a) x -= 2;
        if (keys.d) x += 2;

        x = Math.max(0, Math.min(780, x));
        y = Math.max(0, Math.min(380, y));

        player.style.left = x + "px";
        player.style.top = y + "px";

        checkInteractions();
    }
    requestAnimationFrame(update);
}
update();

function checkInteractions() {
    const t = document.querySelector(".telemetry");
    const tyre = document.querySelector(".tyre");
    const ai = document.querySelector(".ai");

    if (collide(player, t) && data === 0) {
        data++;
        dialogue.innerText = "TELEMETRIA: sensori IMU e GPS raccolgono dati.";
    }

    if (collide(player, tyre) && stab === 0) {
        stab++;
        dialogue.innerText = "PNEUMATICI: grip e temperatura sono fondamentali.";
    }

    if (collide(player, ai) && !unlockedBoss) {
        unlockedBoss = true;
        boss.style.display = "block";
        dialogue.innerText = "AI: algoritmi analizzano strategie.";
    }

    if (collide(player, boss)) startFight();

    document.getElementById("data").innerText = data;
    document.getElementById("stab").innerText = stab;
}

function collide(a, b) {
    if (!b) return false;
    return a.offsetLeft < b.offsetLeft + b.offsetWidth &&
           a.offsetLeft + a.offsetWidth > b.offsetLeft &&
           a.offsetTop < b.offsetTop + b.offsetHeight &&
           a.offsetTop + a.offsetHeight > b.offsetTop;
}

function startFight() {
    fighting = true;
    fieldMusic.pause();
    bossMusic.play();

    document.getElementById("game").classList.add("hidden");
    document.getElementById("fight").classList.remove("hidden");
}

function attack() {
    bossHP--;
    document.getElementById("bossHP").innerText = bossHP;
    if (bossHP <= 0) {
        bossMusic.pause();
        document.getElementById("fight").classList.add("hidden");
        document.getElementById("win").classList.remove("hidden");
    }
}
