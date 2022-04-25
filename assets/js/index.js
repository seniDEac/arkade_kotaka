



// general vars
left =false;
right=false;
jump =false;

// init game
$("#a1").show();
$("#a2").show();
$("#a5").show();
$("#a6").show();
$("#a3").hide();
$("#a4").hide();

//  This Scene has no aspect ratio lock, it will scale to fit the browser window, but will zoom to match the Game
class BackgroundScene extends Phaser.Scene{
    gameScene;
    layer;

    constructor (){
        super('BackgroundScene');
    }

    preload (){
        this.load.image('guide',      'assets/images/640x960-guide.png');
        this.load.image('bg',         'assets/images/ocean.png');
        this.load.atlas('clouds',     'assets/images/clouds.png', 'assets/images/clouds.json');
        // this.load.image('sky',        'assets/images/bigsky.png');
        this.load.image('ground',     'assets/images/platform.png');
        this.load.image('ground2',    'assets/images/platform_base.png');
        this.load.image('star',       'assets/images/fish.png');
        this.load.image('bomb',       'assets/images/shark.png');
        this.load.spritesheet('dude', 'assets/images/dude.png', { frameWidth: 32, frameHeight: 48 });
        this.load.image('table',      'assets/images/table.png');
    }

    create (){
        const width = this.scale.gameSize.width;
        const height = this.scale.gameSize.height;

        const bg = this.add.image(0, 0, 'bg').setOrigin(0, 0);

        //  If you'd rather use a layer to container all Game Objects, use the following (and see updateCamera)

        // const bg = this.add.image(0, 0, 'bg');
        // this.layer = this.add.container();
        // this.layer.add(bg);

        //  Create some clouds to show we can animate objects in this Scene as well as the Game Scene
        this.time.addEvent({ delay: 3000, callback: this.spawnCloud, callbackScope: this, repeat: 12 });

        this.scene.launch('GameScene');

        this.gameScene = this.scene.get('GameScene');
    }

    updateCamera ()
    {
        const width = this.scale.gameSize.width;
        const height = this.scale.gameSize.height;

        const camera = this.cameras.main;

        //  There is 240px of extra padding below the game area in the background graphic
        //  so we account for it in the y offset (scaled by the game zoom factor)

        const zoom = this.gameScene.getZoom();
        const offset = 120 * zoom;

        //  We can either zoom and re-center the camera:

        camera.setZoom(zoom);
        camera.centerOn(1400 / 2, (1200 / 2) + 120);

        //  Or, if you want to put all of the Game Objects in this Scene into a layer,
        //  you can position and scale that:

        // this.layer.x = width / 2;
        // this.layer.y = (height / 2) + offset;
        // this.layer.setScale(zoom);
    }

    spawnCloud (cloud)
    {
        const cloudType = Phaser.Math.Between(1, 3);

        const x = 1400;
        const y = Phaser.Math.Between(0, this.scale.height / 1.25);

        if (!cloud)
        {
            cloud = this.add.image(x, y, 'clouds', 'cloud' + cloudType);
        }
        else
        {
            cloud.setPosition(x, y);
        }

        this.tweens.add({
            targets: cloud,
            x: -400,
            duration: Phaser.Math.Between(20000, 60000),
            ease: 'linear',
            onComplete: () => this.spawnCloud(cloud)
        });
    }
}

//  This Scene is aspect ratio locked at 640 x 960 (and scaled and centered accordingly)
class GameScene extends Phaser.Scene
{
    GAME_WIDTH = 640;
    GAME_HEIGHT = 960;

    backgroundScene;
    parent;
    sizer;
    player;
    stars;
    bombs;
    platforms;
    cursors;
    score = 0;
    gameOver = false;
    scoreText;

    constructor ()
    {
        super('GameScene');
    }

    create ()
    {
        const width = this.scale.gameSize.width;
        const height = this.scale.gameSize.height;

        this.parent = new Phaser.Structs.Size(width, height);
        this.sizer = new Phaser.Structs.Size(this.GAME_WIDTH, this.GAME_HEIGHT, Phaser.Structs.Size.FIT, this.parent);

        this.parent.setSize(width, height);
        this.sizer.setSize(width, height);

        this.backgroundScene = this.scene.get('BackgroundScene');

        this.updateCamera();

        this.scale.on('resize', this.resize, this);

        const guide = this.add.image(0, 0, 'guide').setOrigin(0, 0).setDepth(1).setVisible(false);
        // const button = this.add.image(400, 300, 'left-bubble').setInteractive();

        // this.add.text(this.GAME_WIDTH / 2, this.GAME_HEIGHT - 16, 'Press X to toggle mobile guide', { fontSize: '16px', fill: '#ffffff' }).setDepth(1).setOrigin(0.5);

        this.input.keyboard.on('keydown-X', () => {
            guide.visible = !guide.visible;
        });

        //  -----------------------------------
        //  -----------------------------------
        //  -----------------------------------
        //  Normal game stuff from here on down
        //  -----------------------------------
        //  -----------------------------------
        //  -----------------------------------

        this.physics.world.setBounds(0, 0, this.GAME_WIDTH, this.GAME_HEIGHT);

        //  The platforms group contains the ground and the 2 ledges we can jump on
        this.platforms = this.physics.add.staticGroup();

        //  Here we create the ground.
        //  Scale it to fit the width of the game (the original sprite is 400x32 in size)
        this.platforms.create(320, 860, 'ground').setDisplaySize(700, 30).refreshBody();

        //  Now let's create some ledges
        this.platforms.create(750, 220, 'ground');
        this.platforms.create( 50, 250, 'ground');
        this.platforms.create(600, 400, 'ground');
        this.platforms.create(320, 520, 'ground').setScale(0.3, 1).refreshBody();;
        this.platforms.create(190, 650, 'ground').setScale(0.3, 1).refreshBody();;
        this.platforms.create(600, 780, 'ground');
        this.platforms.create(550, 510, 'table').setScale(0.7, 0.7).refreshBody();;

        // The player and its settings
        this.player = this.physics.add.sprite(100, 600, 'dude');

        //  Player physics properties. Give the little guy a slight bounce.
        this.player.setBounce(0.1);
        this.player.setCollideWorldBounds(true);

        //  Our player animations, turning, walking left and walking right.
        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'turn',
            frames: [ { key: 'dude', frame: 4 } ],
            frameRate: 20
        });

        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
            frameRate: 10,
            repeat: -1
        });

        //  Input Events
        this.cursors = this.input.keyboard.createCursorKeys();

        //  Some stars to collect, 12 in total, evenly spaced 70 pixels apart along the x axis
        this.stars = this.physics.add.group({
            key: 'star',
            repeat: 11,
            setXY: { x: 12, y: 0, stepX: 50 }
        });

        this.stars.children.iterate(function (child) {
            //  Give each star a slightly different bounce
            child.setBounce(1, Phaser.Math.FloatBetween(0.4, 0.8));
            child.setCollideWorldBounds(true);
            child.setVelocity(Phaser.Math.Between(-200, 200), 20);
            child.setDragX(4);
        });

        this.bombs = this.physics.add.group();

        //  The score
        this.scoreText = this.add.text(32, 8, '   Kotaka MasterFish: 0', { fontSize: '32px', fill: '#000' });

        //  Collide the player and the stars with the platforms
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.stars, this.platforms);
        this.physics.add.collider(this.bombs, this.platforms);

        //  Checks to see if the player overlaps with any of the stars, if he does call the collectStar function
        this.physics.add.overlap(this.player, this.stars, this.collectStar, null, this);

        this.physics.add.collider(this.player, this.bombs, this.hitBomb, null, this);
    }

    //  ------------------------
    //  ------------------------
    //  ------------------------
    //  Resize related functions
    //  ------------------------
    //  ------------------------
    //  ------------------------

    resize (gameSize)
    {
        const width = gameSize.width;
        const height = gameSize.height;

        this.parent.setSize(width, height);
        this.sizer.setSize(width, height);

        this.updateCamera();
    }

    updateCamera ()
    {
        const camera = this.cameras.main;

        const x = Math.ceil((this.parent.width - this.sizer.width) * 0.5);
        const y = 0;
        const scaleX = this.sizer.width / this.GAME_WIDTH;
        const scaleY = this.sizer.height / this.GAME_HEIGHT;

        camera.setViewport(x, y, this.sizer.width, this.sizer.height);
        camera.setZoom(Math.max(scaleX, scaleY));
        camera.centerOn(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2);

        this.backgroundScene.updateCamera();
    }

    getZoom ()
    {
        return this.cameras.main.zoom;
    }

    //  ------------------------
    //  ------------------------
    //  ------------------------
    //  Game related functions
    //  ------------------------
    //  ------------------------
    //  ------------------------

    update (){
        if (this.gameOver){
            return;

        }
        //
        const cursors = this.cursors;
        const  player = this.player;
        //
        if (cursors.left.isDown  ||  left==true){
            player.setVelocityX(-160);
            player.anims.play('left', true);
        }
        else if (cursors.right.isDown || right==true){
            player.setVelocityX(160);
            player.anims.play('right', true);
        }
        else{
            player.setVelocityX(0);
            player.anims.play('turn');
        }
        //
        if ( (cursors.up.isDown || jump==true) && player.body.touching.down){
            player.setVelocityY(-330);
            jump=false;
        }
    }

    collectStar (player, star){

        document.getElementById('player_html5').src = "assets/sounds/lol.mp3";
        document.getElementById('player_html5').play();

        star.disableBody(true, true);

        //  Add and update the score
        this.score += 10;
        this.scoreText.setText('   Kotaka MasterFish: ' + this.score);

        if (this.stars.countActive(true) === 0){




            //  A new batch of stars to collect
            this.stars.children.iterate(function (child){
                child.enableBody(true, child.x, 0, true, true);
                //  Give each star a slightly different bounce
                child.setBounce(1, Phaser.Math.FloatBetween(0.4, 0.8));
                child.setCollideWorldBounds(true);
                child.setVelocity(Phaser.Math.Between(-200, 200), 20);
                child.setDragX(4);
            });

            const halfX = this.GAME_WIDTH / 2;
            const x = (this.player.x < halfX) ? Phaser.Math.Between(halfX, this.GAME_WIDTH) : Phaser.Math.Between(0, halfX);

            const bomb = this.bombs.create(x, 16, 'bomb');

            bomb.setBounce(1);
            bomb.setCollideWorldBounds(true);
            bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
        }
    }
    //
    hitBomb (player, bomb){
        this.physics.pause();
        player.setTint(0xff0000);
        player.anims.play('turn');
        this.gameOver = true;
        //
        console.log('   the end.')

        document.getElementById('player_html5').src = "assets/sounds/pain.mp3";
        document.getElementById('player_html5').play();
        //

        // document.getElementsByClassName("onFinish").style.display = "block";
        // document.getElementsByClassName("onGame").style.display = "block";


        // var x = document.getElementsByClassName("onFinish");
        // x.style.display = "block";
        // var y = document.getElementsByClassName("onGame");
        // y.style.display = "none";


        $("#a1").hide();
        $("#a2").hide();
        $("#a5").hide();
        $("#a6").hide();
        $("#a3").show();
        $("#a4").show();

    }
}
//
const config = {
    type: Phaser.AUTO,
    backgroundColor: '#000000',
    scale: {
        mode: Phaser.Scale.RESIZE,
        parent: 'phaser-example',
        width: 640,
        height: 960,
        min: {
            width: 320,
            height: 480
        },
        max: {
            width: 1400,
            height: 1200
        }
    },
    scene: [ BackgroundScene, GameScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    }
};
//
const game = new Phaser.Game(config);


//
//   extras by sena
//

// directional html buttons
var myElement = document.getElementById('a1');
var hammer = new Hammer(myElement);
//
hammer.on("press pressup singletap doubletap panleft panright tap", function (ev) {
    // console.log('  the presss')
    // if (ev.type == "press") {
    //     console.log("Hold active");
    //     right=false;
    //     left=true;
    // }
    // if (ev.type == "pressup") {
    //     console.log("                 Hold inactive");
    //     right=false;
    //     left=false;
    // }
    // if (ev.type == "singletap") {
    //     console.log("                                     singletap");
    //     right=false;
    //     left=false;
    // }
    // if (ev.type == "doubletap") {
    //     console.log("                                                     doubletap");
    //     right=false;
    //     left=false;
    // }
    if (ev.type == "panleft") {
        console.log("                                                     panleft");
        right=false;
        left=true;
    }
    if (ev.type == "panright") {
        console.log("                                                     panright");
        right=true;
        left=false;
    }
    // if (ev.type == "tap") {
    //     console.log("                                                     tap");
    //     right=false;
    //     left=false;
    // }
});
//
//
//
// var myElement = document.getElementById('a2');
// var hammer = new Hammer(myElement);
// //
// hammer.on("press pressup singletap doubletap panleft panright tap", function (ev) {
//     // console.log('  the presss')
//     if (ev.type == "press") {
//         console.log("Hold active");
//         right=true;
//         left=false;
//     }
//     if (ev.type == "pressup") {
//         console.log("                 Hold inactive");
//         right=false;
//         left=false;
//     }
//     if (ev.type == "singletap") {
//         console.log("                                     singletap");
//         right=false;
//         left=false;
//     }
//     if (ev.type == "doubletap") {
//         console.log("                                                     doubletap");
//         right=false;
//         left=false;
//     }
//     if (ev.type == "panleft") {
//         console.log("                                                     panleft");
//         right=false;
//         left=false;
//     }
//     if (ev.type == "panright") {
//         console.log("                                                     panright");
//         right=false;
//         left=false;
//     }
//     if (ev.type == "tap") {
//         console.log("                                                     tap");
//         right=false;
//         left=false;
//     }
// });


//
//
var myElement = document.getElementById('a6');
var hammer = new Hammer(myElement);
//
hammer.on("press pressup singletap doubletap panleft panright tap", function (ev) {
    // console.log('  the presss')
    if (ev.type == "tap"  || ev.type == "singletap"  || ev.type == "press"   || ev.type == "doubletap"  ) {
        console.log("Hold active");
        jump=true;
    }
    if (ev.type == "pressup") {
        console.log("                 Hold inactive");
    }
});
//
//
function newGame(x) {
    window.location.href = "index.html";
}
//
//
function goPrivicyPolicy(){
    $('#oneModalBodyHelp').html(goPrivicyPolicyText);
    $('#modalHelp').modal({});
}
//
goPrivicyPolicyText ='<br> <font  color=#2F4F4F  >Se tiver d&uacute;vidas, por favor nos escreva um e-mail. <br><br><a mailto="vovosdepijama@gmail.com">vovosdepijama@gmail.com</a><br><br><br><br><h2>Pol&iacute;tica de privacidade para <a href="http://vovosdepijama.com">Kotaka MasterFish</a></h2><p>Todas as suas informa&ccedil;&otilde;es pessoais recolhidas, ser&atilde;o usadas para o ajudar a tornar a sua visita no nosso site o mais produtiva e agrad&aacute;vel poss&iacute;vel.</p><p>A garantia da confidencialidade dos dados pessoais dos utilizadores do nosso site &eacute; importante para o Kotaka MasterFish.</p><p>Todas as informa&ccedil;&otilde;es pessoais relativas a membros, assinantes, clientes ou visitantes que usem o Kotaka MasterFish   ser&atilde;o tratadas em concord&acirc;ncia com a Lei da Prote&ccedil;&atilde;o de Dados Pessoais de 26 de outubro de 1998 (Lei nu. 67/98).</p>  <p>A informa&ccedil;&atilde;o pessoal recolhida pode incluir o seu nome, e-mail, n&uacute;mero de telefone e/ou celular, morada,   data de nascimento e/ou outros.</p><p>O uso do DEac pressup&otilde;e a aceita&ccedil;&atilde;o deste Acordo de privacidade. A equipe   do Kotaka MasterFish reserva-se ao direito de alterar este acordo sem aviso pr&eacute;vio. Deste modo, recomendamos que consulte a   nossa pol&iacute;tica de privacidade com regularidade de forma a estar sempre atualizado.</p><h2>Os an&uacute;ncios</h2>  <p>Tal como outros websites, coletamos e utilizamos informa&ccedil;&atilde;o contida nos an&uacute;ncios. A informa&ccedil;&atilde;o contida   nos an&uacute;ncios, inclui o seu endere&ccedil;o IP (Internet Protocol), o seu ISP (Internet Service Provider, como o   Sapo, Clix, ou outro), o browser que utilizou ao visitar o nosso website (como o Internet Explorer ou o   Firefox), o tempo da sua visita e que p&aacute;ginas visitou dentro do nosso website.</p><h2>Cookie DoubleClick  Dart</h2><p>O Google, como fornecedor de terceiros, utiliza cookies para exibir an&uacute;ncios no nosso   website;</p><p>Com o cookie DART, o Google pode exibir an&uacute;ncios com base nas visitas que o leitor  fez a outros websites na Internet;</p><p>Os utilizadores podem desativar o cookie DART visitando   a Pol&iacute;tica de <a href="http://politicaprivacidade.com/" title="privacidade da rede de conte&uacute;do">  privacidade da rede de conte&uacute;do</a> e dos an&uacute;ncios do Google.</p>  <h2>Os Cookies e Web Beacons</h2><p>Utilizamos cookies para armazenar informa&ccedil;&atilde;o,   tais como as suas prefer&ecirc;ncias pessoas quando visita o nosso website. Isto poder&aacute; incluir   um simples popup, ou uma liga&ccedil;&atilde;o em v&aacute;rios servi&ccedil;os que providenciamos, tais como f&oacute;runs.</p>  <p>Em adi&ccedil;&atilde;o tamb&eacute;m utilizamos publicidade de terceiros no nosso website para suportar os custos de manuten&ccedil;&atilde;o.     Alguns destes publicit&aacute;rios, poder&atilde;o utilizar tecnologias como os cookies e/ou web beacons quando publicitam no     nosso website, o que far&aacute; com que esses publicit&aacute;rios (como o Google atrav&eacute;s do Google AdSense) tamb&eacute;m recebam a     sua informa&ccedil;&atilde;o pessoal, como o endere&ccedil;o IP, o seu ISP, o seu browser, etc. Esta fun&ccedil;&atilde;o &eacute; geralmente utilizada para geotargeting     (mostrar publicidade de Lisboa apenas aos leitores oriundos de Lisboa por ex.) ou apresentar publicidade direcionada a um tipo de     utilizador (como mostrar publicidade de restaurante a um utilizador que visita sites de culin&aacute;ria regularmente, por ex.).</p>    <p>Voc&ecirc; det&eacute;m o poder de desligar os seus cookies, nas op&ccedil;&otilde;es do seu browser, ou efetuando altera&ccedil;&otilde;es nas ferramentas de programas       Anti-Virus, como o Norton Internet Security. No entanto, isso poder&aacute; alterar a forma como interage com o nosso website, ou outros       websites. Isso poder&aacute; afetar ou n&atilde;o permitir que fa&ccedil;a logins em programas, sites ou f&oacute;runs da nossa e de outras redes.    </p><h2>Liga&ccedil;&otilde;es a Sites de terceiros</h2><p>O Vintage Radio possui liga&ccedil;&otilde;es para outros sites, os quais, a nosso ver, podem conter informa&ccedil;&otilde;es       / ferramentas &uacute;teis para os nossos visitantes. A nossa pol&iacute;tica de privacidade n&atilde;o &eacute; aplicada a sites de terceiros, pelo que, caso       visite outro site a partir do nosso dever&aacute; ler a pol&iacute;tica de privacidade do mesmo.</p><p>N&atilde;o nos responsabilizamos pela pol&iacute;tica de         privacidade ou conte&uacute;do presente nesses mesmos sites.</p></font><br><br>'+
''
;
