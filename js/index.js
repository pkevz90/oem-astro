let cnvs = document.getElementsByTagName('canvas')[0];
let ctx = cnvs.getContext('2d');
cnvs.height = window.innerHeight;
cnvs.width = window.innerWidth;
let earthSize = Math.min(cnvs.height / 8 ,cnvs.width / 10);
let orbits = [{r: 21000, mA: Math.random() * 2 * Math.PI, n: Math.sqrt(398600.4418 / 21000/ 21000/ 21000)},{r: 8000, mA: Math.random() * 2 * Math.PI, n: Math.sqrt(398600.4418 / 8000/ 8000/ 8000)}, {r: 12000, mA: Math.random() * 2 * Math.PI, n: Math.sqrt(398600.4418 / 12000/ 12000/ 12000)}, {r: 16000, mA: Math.random() * 2 * Math.PI, n: Math.sqrt(398600.4418 / 16000/ 16000/ 16000)}]
animate();
function animate() {
    ctx.fillStyle ='rgb(0,0,0,0.2)';
    ctx.strokeStyle = 'rgb(0,0,0,0.2)';
    ctx.clearRect(0,0,cnvs.width,cnvs.height);
    ctx.beginPath();
    ctx.arc(cnvs.width / 2,cnvs.height / 2,earthSize,0,2*Math.PI);
    ctx.fill();
    orbits.forEach((orbit,ii) => {
        ctx.beginPath();
        ctx.arc(cnvs.width / 2,cnvs.height / 2,orbit.r * earthSize / 6371,0,2*Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cnvs.width / 2 - orbit.r * earthSize / 6371 * Math.cos(orbit.mA),cnvs.height / 2 - orbit.r * earthSize / 6371 * Math.sin(orbit.mA), earthSize / 15,0,2*Math.PI);
        ctx.fill();
        orbits[ii].mA += orbit.n*30;
    });
    window.requestAnimationFrame(animate);
}
window.addEventListener("resize", () => {
    cnvs.height = window.innerHeight;
    cnvs.width = window.innerWidth;
    earthSize = Math.min(cnvs.height / 8 ,cnvs.width / 10);
});