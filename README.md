# BANG! The Dice Game

### References

- [BANG! The Card Game in Node](https://github.com/dagothig/node-bang)
- [BANG! The Dice Game in Python](https://github.com/mrgriffin/genbang)
- [Dice Game in Node](https://github.com/sabival89/dice-game)

### Roles

1) **drys**: Tsekare ti mporoume na kanoume me WebGL. Alliws apla animation me image kai ligo css 8a mporoun na doulepsoun (px ena arrow h ena bullet na metakinitai, h image apo bang na emfanizetai gia ena instant). H character models - animation, 8a paizoun polloi xarakthres. 3ekina apo kapou pou fainetai prosito na doume liga xrwmata asap 

2) **leas**: contribute sto core logic tou game. Tsekare ta rules (https://www.ultraboardgames.com/bang/dice-game-rules.php) kai skepsou ta objects kai ta functions pou 8a xreiastoume. (px ena class me olous tous characters, gia ta dice outcomes ktlp). Draftare mia domh kai to syzhtame sto merge request 

3) **di**: sthse ta routes kai ta endpoints tou app. Px na skeftoume an 8a xoume user authentication h oxi , create game (out pass-id), join game(in pass-id), game turns ktlp. Ftia3e ena arxiko template pou 8a skefteis.

4) **cri & regent**: to serveri gia na kanoume deploy to app. 8a prepei na mporoume na sthsoume node kai pi8anon react. Psaxteite an 8elete kai me ta utilities tou gitlab, exei apeira skhnika p mporei na exoun value

5) **gus**: steise liga proxeira front-page html/pug , settare react kai arxise me to chat function , pou 8a einai accessible gia tous game participants.

### Node Express template project

This project is based on a GitLab [Project Template](https://docs.gitlab.com/ee/gitlab-basics/create-project.html).

Improvements can be proposed in the [original project](https://gitlab.com/gitlab-org/project-templates/express).

### CI/CD with Auto DevOps

This template is compatible with [Auto DevOps](https://docs.gitlab.com/ee/topics/autodevops/).

If Auto DevOps is not already enabled for this project, you can [turn it on](https://docs.gitlab.com/ee/topics/autodevops/#enabling-auto-devops) in the project settings.

### Developing with Gitpod

This template has a fully-automated dev setup for [Gitpod](https://docs.gitlab.com/ee/integration/gitpod.html).

If you open this project in Gitpod, you'll get all Node dependencies pre-installed and Express will open a web preview.

