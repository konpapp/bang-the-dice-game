# Contribution Guideline:

afou settarete git kai ssh keys (exei tutorial sto gitlab) anoigete powershell kai:

```
git clone git@gitlab.com:kon_pa/bang_online.git
cd bang_online
```

an den yparxei to branch kanete create kai switch to me:
```
git checkout -b authenticate_user
```

an yparxei to branch kanete mono switch to me:
```
git checkout authenticate_user
```

(to authenticate_user einai example onoma branch)
kanete tis montes pou 8elete ston kwdika kai otan 8elete na kanete upload:

```
git commit -am "commit message"
git push origin authenticate_user
```

afou kanete push sto branch pou ftia3ete, sto gitlab page anoigete merge request (an dn yparxei hdh), kanete assign to branch, kai bazete mprosta 'WIP' (work in progress) gia na mhn mporei na ginei merged mexri na einai etoimo. Sto merge request 8a kanoume thn kouventa kai ta comments panw ston kwdika, exei gamata utilities to gitlab g auto

Gia na sygxronisoume to branch me to master, afou kanoume git checkout sto branch:
```
git pull origin master
```

An paizoun conflicts ta kanoume resolve me 
```
git merge
```
