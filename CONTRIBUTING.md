# Contribution Guideline:

afou settarete git kai ssh keys (exei tutorial sto gitlab) anoigete powershell kai:

```
git clone git@gitlab.com:kon_pa/bang_online.git
cd bang_online
```

Sto directory tou project, me to parakatw command kanete create kainourgio branch kai switch se auto (example onoma branch 'authenticate_user') 

```
git checkout -b authenticate_user
```

ama to branch yparxei hdh, tote gia aplo switch to branch xrhsimopoieite to parakatw

```
git checkout authenticate_user
```

kanete tis montes pou 8elete ston kwdika kai otan 8elete na kanete upload: 

```
git commit -m "commit message"
git push origin authenticate_user
```
(to authenticate_user 8a antikatasta8ei me to onoma tou branch sas)

afou kanete push sto branch pou ftia3ete, sto gitlab page anoigete merge request (an dn yparxei hdh), kanete assign to branch, kai bazete mprosta 'WIP' (work in progress) gia na mhn mporei na ginei merged mexri na einai etoimo. Sto merge request 8a kanoume thn kouventa kai ta comments panw ston kwdika, exei gamata utilities to gitlab g auto
