from __future__ import annotations

import base64
import gzip
import shutil
from pathlib import Path

import tinycss2

ROOT = Path(__file__).resolve().parents[1]
FILES = {
    "src/utils/dashboardAggregator.js": 'H4sIAGo4YGoC/608XW8bSXLv+hVtrHEz3B1S9McufNTqBJ4kn3VrS44oe3MRFGk4bIpzHs4QM0PJOh2f8xAEyD3fSy5AECAvCYIFAqwf8uBD/of/Saqqv+eD0n4svDCnu7q6qrq6uqq62vF8keUlu2WXvDxepmU857tJzNOSrdg0z+bM6/U2C55fxREvNnMBsRllOe/9vvC2NmI5foMhht1lnsPYF9mc51k2/zbL3xWLMOIHkwAAXhy92j8+Onp1Pjo5Ot4/33+7f3iC7UkWTmpDgg1NwOZMdo7K2rxs+Pr1+ZvR8DcKHzHCI6BiuFi8KcJLbjjZDGVTFcebk6PR8K1EYcMvy6wIr6rwx/ujozfHu3pKZOCYF9kyj/jLeJyH+Y2FJHd7anL79uj4m/MXb359vrf/8uDt/vHvLMnERYkSebEcH2ZlPI2jsIyztMC+nM/5fMxz2X9Q8rkts2vRvMeT+IpXZ2VxMZzM4/Q4S3gAH3t8EeblHIT2kocTnmO7zQF8FgLDRgTTl0Tz6PVQiYBtM2/Mi+61Wr3ucjEJSz6BEWLA3vB3APTsq6d9/E+1SjGeHLzaP3pzcv5qBDBPvzT9e0eH++c4F7Sn/JqNeOmfelE2XyQcsQfMgyXNsyv5O49msfwdhWnEkwQ+zjpbFtUk6ZdHu8OX56+P958f/K1Ne3e2HHevHvV/+aSbZFGYGPKPh89PKgMuk2wcJt1JHk5LHPTsKcpnukwjXCNSCq3NfoeWOp4yv7xZ8GzKruN0kl2z7W3AtkwnfBqnQGsHlrVc5iksURmOiwE7PWOrLRgpyACmJjEK9ht+UwAdpxWpXz1C1p22WkMXEavWbMFT0XCGs0yznPliqnf8hgGZzoyCCcZK0G/xSxEG6lPwCVD029HRYY++fMFhjwSJOxf3HWxOVFQfsHfYH//IvHSZJF5ny0GG9ACqYZ6HNz3QVPzbFzN02I6aa8D8JoidHg43cPTJUJB6FloFaO0lPL0sZxWZC3kzUH/YbNFMM7q5yQ4uUzBArChD2B5aoAzEE/bEmA3xf+MirjY2+Hvaf2pLjF78+mh4vHcOagUm5UV9L3UnYTEbZ2E+6eZ8CoZkBirWgsQ2SbiPTtdY3KrRxCbHBmJLxcpJS2Xt+mC98WrhL9g4s7eJsI0ncKpky9JPwjFPAlaKT+CiZiGEDgrmeZ6DwgrTsI+//YuHt4RixUBrWZqVsBTFIksnsN/KWZyyh7cS92pe9C5IJQhLL8omHEVfE6ic2jOggmQApqm2zHpTNy20Zg+nHTksgrmaxwWY3fvyCqaOgIhT2C7WhK8Frl6OJuaUVFA3wamTXHE1XSegXpSUhPD98wDw/J5HZYdt/0rruZqq4KUi2ScAAeuvW7BOx/yUu4gmPuv0wL6FSXIjcYnJaCPidB0WJTzMFVLRhghWHVecQFQJNv1tmCy5DywukzJgU0A8DqN3WqS0DoUxuQKwB/u2XBbC5E6XyTSm40Fvfwl1hbj1Yhe9xbKY+bdSTwdqijkv0JEYqFE5D4ss3enJdrRtozKP00vfAcB2wtAh1vRCKhZcbkNp2YgkwY6Edy2f7N9h9IOMnYsIpZsKMCMu1HbP3k4lf09qKOgWuHZ2EKgHTXPfJphggZlmwkHSeXk03VO0yT26B+eI37GnxJMFOgVQDC14asOxg5DAjx4kORxUW7bkCh8u0RUCgRyGhz4ixZMG1Qmm0wusNg/1gya9gCUt/H7A5B+bP4RxecIWoXfWcuDcD+R3ZZbKwdhAuBzg0C4PLUM9SgEwAuuiq0rUTfEc9vNhdq2WN0WvokXcsCyAGTd3ZYE6huJxWHAXAjBqQT+QKGDpHyBkjW35+SosZ708A8/G98UQwxPr0iQ2k5voIFb2OrilWcpHtGl9sXedPaCdw94sLHyh4hKsV2Yvs2ue78I0gL4isyUh5aQnAZvAJMAvKHLRKj3inHQV+MYBmm0PPII5OYpGpck1s1dGTGSLUQBtC4PeiExDfQ2KqQHA082Bfq+Gx4IpM2it4NhmTwxAkWWpZ62VmdbZw+GUv0Tf7bdgt9BhcyyHoPuH+bTGVtgu5M/oQMp5JC4wXfaMrj/XQNLKYR/s9YTYl/GVvyzwnLL0T1lnV1DggTSGGavBw1tEsdMDxwQIF7/5PIwT4uNyyYvSW10E6KlWNFasT/wHjrQQ+zFGeywS4fYbTZmQZVgU8WXKOaqhIhIH7PRUz3k8gU0yDxe+MPbW9oeokNM4iaMXp1GynPBCgvrWpIoXOCFoMcQkEYgOgrPz8Q1pQgXe2ih0Logx8Ps8LAUuSzOlmzAZsAt0h0GEAjyegKCoTx3LHvZ7dttLPGah4yRfppes/PivcxZ9/A5+XsWfPvxDJGFL2MwDScQij7M8Lm+kAoPRSksP7K83CdNLnnusGXAWX84I7DrMU5AQwtnklDG4LAN5BgsE1AQh2K5FEItm//dfIfvrnz59/z9gqT/+R+pJpw2EH+XxAlXBRWN1KFCQ/AAlKz5lFD4sFeWyQcraXS/Rpsdm1ynPB0IfgLndTx/+PQSyvouRP5sKAjxPwzlv0oFzUnFJnjDP7nDRhtG7ULmJYltJ2QVXrYE2W4p1sZL2oWFPIKHgSCqVumC0L9cIVhpwHkyUnJRei16UgRweXgsQ/Fy17FKVCqL5HZNh6bPKCmmdjpJsOTmYGBk2KLka1Kjo38wyNvv04Z8ilqBCLRs03PaAIfKfkLbuqCQKyJLVJ2lTX0MoONL8EJYfluSFNf9PU2iDPoxHy/kcc2pGvUC5LrP8xtF6R8OHdQUftuq8Wmep8jZFywXmcXh+6Ki3aiWtv49uK2G7ulpbE5PMcpRVrUg3ESnEFqVt0CCbu3W6G2UQC0XlHuayCuuou//hfnpmLHuZveMp2HYhipZTL1BnXgdio0WCEezm6d+H3T8Mu3/X7/6yd77ZPfti8xLAugBSJDEAgJf+6FnfOq0WOdDxHqaCY9fO0eFpS1SsBhfWiUPsYW7EZLswugbOOCLpb8mfX7Mm30OkixTMF9vsUcfxYTBltt04Enp8GiUdFfInoZFWPy+Lb+Ny5gte4CQFbGWciiC05h/V3DIbpYQCQctFkw0PcNGyMcbvXjN+UrVviAHAKcUtKFJpMgEuZCijYpVQQ4NGHSB2hUkZLyajDgD5bLOx2zYwKmmnLIz8hqWan6g2haLjYHgbN+F4G1tYylYMcYSmyNs79lRLGOEdArR9Nnn21fTJM92B9wF0okqk8tuaxjFBfTXuHSgAoCMxaWSKkEAmS7bcBKIUdpHlpe+HARtT8kRHJ2N78j7GVbordLusDfRlxbkMyxKME8bdJxg4+DqvGTCKJA6KzI3Y44TUXIGBgdYYdnqnasyZCkDcVAUNNyE5fZpQBVH/4hdKeeVUju7KcUf0LXI1hURq+Y2yGxYwj6G/kdYRB38DWEIB3a46tAB4lJU89/1T2ARnJGzaDWaTapGoAUlYvgI/2j8NRBZDjHIyNzsQCF/TPCLWri7AuOBAzy4Ey2W79FXQcY/V0lzAtFa2TayfOm7kXgEQfQTRxri2ZVQJpJ0o69Qjwku8Srj69P1/wukW4MnA30dg5ekOxvoJYuLemQkmpFMmcnzKsjpiGS/jRF8LSg/AZndNpK6hWpIySlI4Hkx1mR2MjmR0Y5809kETAlFX4FcC8WlpB1Z6LpCi6DTyF/4fLIB0ZAgHGWPKNljocz7H8yFvxqx7G1A/kJ4TZjFg6zg+BZl97PFsThKet3AgutonkTnlSfNEqteebLmIMqD9sllg0YxPlgmv7D09q3vF1JBXkazLvIymKC+HpUm3WCpLKB7IrAsyQQ2/goNff3wNp/pTlboWdLVZ39BMHep565Z4bMDGFbBOLdSNEoiC0NdUZ5mRFnW9zjP0tnd6GhD21stPH/68AG8bIjSWztD3nnvaKSWdJNsyqCix3HUCUOxlsimDuy2SdCiVWg7MTxcp6dNA/u10KcVwHV110e81uKj6KgyDu8K/pRMIkyHgX5PFQihx/ZBgvMaU11ygLliX52zVZjycpSilLBTqun7qRCK29ESST/zMUpnvE6eXyMh1HAHITN7PM4FKC7pT4PAM/ZqfYwpKGrr4ZVAzlMHjwEi82QI2hp8KpdypX5hlvQeSYjmexyVWAnQatWug1cHpdtRh4H5agLUYab4ANaV8IA8TcAZioX3rMu66VkGmutq4oqSyPgfVaLyeJ1m0j35ghlvjhD7AKI3hZ9QuK/wSi3gHb+tXzA7msktQIcOsAGA7zm2CkeimA9Zhn8OR3cdLor51sMbFuxGWKwFSwgJq4QNYoGUEo56B2ilWPmf4JUDD9+gHGBFKerrsGU72tG6+FQdyi8PAQW24s/2djaTyNSXupbg2RLMiPhN+hWkfwyCcY1/1MZsjEpKVrid9kaIsI+rzLrNsYpnZsLhJI1YrXnET31KlRX3Ydq1kTDiIFFBLnRVxNrboO3NPFdYIX00ig+NXpQnai0xuqdJCXu+yFfoU12GsCOphtZJPib3z2XJ8TjRg5oBjZsP3PoffWQ5nlO+ZLCi4prfgmURiAQbCLyOPNAY19Z/0+07VyAOauqPpYppTpAwPdcGxjBQ1z5SZ8VTPqq2+ZBhFeOR2iwiUZgL94CDh0RrGcGqFVxDlhOOEu6UmRJa7DxRNzVcYttIyacFUgrGy7SQDoC18vihvvHZdUSnPwrc1hZYa6yTq9XG+Za1+gEIpJ5Iwg7Zgs7jIqGVfOzXVq3AnNdGw5+rkj9VDvfxSIdWhqBTS9CvNjCeBuBCw0p+BSnEGMofopBwDdAKtXwXwHRitDkx6Mwjj80IET/bUceF7E05mVOwCus8z/ffeKGaI2DGP7r1jQp0RKEOxhDperWfSzXCYqYfxdGC1yMTnAMNXsCB2l8pNiz4jNgvETvEKMFfWDqi+TxFwWuI2NSrdLICstbCAdFJbAJlVMkCrTqfBllSVWJgWV4nXGhmyCExmku+yLs2Got0OqHjdOjSqN73XpihYbPn2omFjsEycjMU0esc1Vg7TqMCex01cKFloAFXEs9MzNX1gynFL6KSfNJAKUMoBoHzVlE2nibwr04aljletWDfLu1X7I8OqVett9a1NM5FnroaMha7eZGP8OlQRwH181jxM8Yr/1sQo/UCFQ49wSowpHgdymw7YEzGrygvB/qRJzqqRczUNxfd4AqfmNk14qt3RUPqioeWInoHT5UKNJdTYhjKpcINf54BMk5NY13e5wLC48yV+0YkidhWXj7HO+1pzWx2vePFVw2mo7yrPsBbhMWYFTO+42mtod1Bq8p1WR6F9U5okZNfZsYptQEcP0mmcwlCiwACP1wM31d+pcOpbqqZUyiRTM4+e3hFYtwQJtl5MYlED1pDp6bllNCaro4Y4mR3VqLM7quFrgVlmHisqWpMkSKwmsI5dy2vCQ7Lz+7gN93SqIg0XxSwr/ZZKjYSq7dGqN5bgu7UWWIVfDzlAYXmuzht91ZfhjYrEjgaJfpGpKTl6lbmnggjskNkafBEwsJ8GNMxv7johcL5VVsGEU/RbJx7gdy1JAG0mPO8H1WC8z1bq3lmoGlYzSgKVETNNgHQq8viIWgPKyQrTpO68KBIzzTm9FNHeq+lQmaiBdQxc68gfWVexnuCeQr2KGBbKWSLzWUrmdVRGXzKKE+GYYr0iEkWTIJIKnWuttBryzccAT6CQsitWFsxpNezpRjG5U6fecMCvVe31x8qPU3aZtEaVpKHrlNPAyzph7SioqugwSUaiS5ZL1+uz7dDX3raBKBqBZnVQN4+1QqHAXN0X6wdpv6kyo06Ito9ueSJUrdMK2JN+h4pmLCAPW8FjFzXalvgsTdNhvHHfjpUX5pRjy4/T/lmgHMZBPQZ1GTTuC86FOmikHDhkOJclouO5KUe8I8JUI9YT/sgmXIUn1cnuCDqbWTJa0MqUWun1JD4mEtd4gWZOk0tvm9LNirfM+OQMKxIbFKeC1FEQlbM0yiKkJsI8ffDfp67RWUWwlmFK6o5rro43M+PgzuwxlnI1KMaBTpnYiiKIrq8RADbeTrpr2HMvKxvW+kQecYBPNWFtkTgcjawCUXFCTPhWCZk24uoizaqPpAsxHFWrIXPuWCo1ZKrPul6yasiqQ++uDEv1BdU/QiyT4D3Vj6sBA+XjDcVejVd/DRVd6rO9RuuOwizryWH7hdX6MsKVqJFFW2ouoo0CVDxrcTphqsNS+rXZ/0CNqGrXnaNgd0vX3amzsje1dr3QTDjx5E8g1Nc72NmGP+TySDzsk0ysZUC5hLbhaOXkR1KjOfuRd1iNfDzryAc99j2JdnrxdK4I/6zx2tqJ+3Qeqxr89SshYrgOVN2POwUTG7U8jzyeTX7GNu9WqQC9m9quv992PcxnnYZ6Prd8sRm/jADo/HoVLqSbirU7BIRSFPgCXMFatYJ8V6oXFL5IrvA37XNRAkFmQd9Uw4oiLuLsDGvY9iH2agl89dMcUhDzysb7DF+tF55JD1QYodcvAl7XVW3ZMY8GhCNdAgbMLt2jGYWpkt1O4V5jnZ6g0lTYmW+w9yfxp+//d8HKTx/+LXKL7isFdxYubIChvzkyMKoEj/rFh54KVjzLhXyePPpyGj3VJXWVmne7Do6+4WQrh1QIUWkEfbHhMKRrKeKjfvxJBFhPre0qvrrqaS8Dda26OLKUrdO8e8UbMXvn6t0qu8JqV3V3fmVvzkrcq62IZfjuYUaa0kd1C9IM1UJee27DBJVuwdZPzXg4GY32IpOB437eVXIycI+05gqUjpvoqCQ56gmOSnKjIbHRmNRwExr1VEa9rsHl1FCaVv8NCjcnUc1HWHl2ykpY0YAA0lWwdbE1wpmsRcXTtsHqaQydwMAtrRMYJ2TcrDca+ibVtqLYSNudTLs4sfXbEVUH11N+X6fpX+XwXZCtjbtMvj3hjqiaNi2rC9TpzzatQ0bRaVWeU7EPHAwzolieDnJFJNgkBqNVRrP9K7xpxd21uyzKbC6+Wx7vi3BsxTje/jnoKrPKOfVtRHUpsKA7LPVimJex+Ig7vVwKX8C7iuniEbeIeqNJF663q4ZXxNUXulv2y02dRzfot8UE9LrJfqoy+/T9X1IyHYcZIbWfpKGgDtIy6SHJaNCeEyd+I9qruPv2UNzwpN03I0/YChLbjrhG5qPyBi2XV8xAPhLAbZNXeQMacAPNj7uT+DJG4Dls/pnTcsNDjHfSJeyPOPIwxS1ETSa5OXOtVWlvKQJBtRLu09jauqxL9tFlC66Juq+xUFbD4YbKTvOWWa+inv6BFHDH+lcE5HROtZJasYuHt1TOA+4bvYbtrCYqTXux1YRBluvp57EgFmYe1dbARWWcnm2PXrKzh7c412py4dxV3EPt9RuAO/n6m+XHvwhlZTUWWXr58V9uLrY27uTur/8Mzloq8cw+fjdnqfV8uJ3P3Y//rbm0ZvtBjDYoIxiNPUsfa8pz11NtdSm0Ru9WG/8P03GyP/ZKAAA=',
    "src/pages/WorkDashboard.jsx": 'H4sIAGo4YGoC/808/W8cx3W/668YXdTcXXM8So5stRLvWIpiIiES5ZK0nUBRpb3bIW/Dvd3zfpA6XBZwEVT+IS1c16kNw05rV3HdpCicogaMiCgKlIH/D/Iv6J/Q99587Mze3hdNJxZs3u58vHnz5n3Nmzfr9QdhlLAt7nSTBhuxNObrju93nO5+A182dnc51sDjPd4P6WGL79LvduIknGVsNwr7rBohiOqNC56AOGJx2om7kdfhO07Hz9s1m8sxjw68Lo+XozRIvD5f7oYRb/4kNnpfYOzW2vbtm/fXtm492r7/ytb6xqONVzc2d7YbUNWFwRK+0R8kw1tO3OuETuRuB84g7oUJ1ruq8FbK7zod7mPhbhj1nUS3vwUQsHiPG2WpmBSW+6HjlgIPBzzQFTtOBAAaF4zZpYnnx8sahbW9vYjvOUkYWTMkOiRDH6hwGEb7S7r90sGVKy9da3bjuRr76ZM0Glp9LnTDIE7Y+v2Xf8RaRMkD7zr9MjZw9viOl/j8OqvePHn+LNhjv3/bOzn665T1jj8KetUGNevxKFTNfugFrAuVoVF3lzsuVK1jMeufHP07wOmcPP84AGgnz/8nYAcnRx94rGwEdjPynIBtBHu+F5vjbacdBHn8O+gR9JyUJQAwZMHxbwJ4Pzn6DMr3ANAvGbz8XZf14PnNlL2ewiDs4PgjlkTpEMYBbKGkj61+HexdlCMkwJ0wCozwfe8YwB54AFfW+TAbqtrZWb+n2oeuM4SiV3EUGOz48z4LnKGsdYFPwjCA+u2T558N1Kx7SALZJB10w74X7EGbuydHP+/22JWrLNg7/kjBCA94BHBozp/D3A7ESK+nxx9bgADMwOeJR8PtnBx9wXxoyHohUJMl5qolTrwfF+EVMI+BCm5KC1uOljMYROGB4yOgl3vHv4G5AlXfTFR1N/EOvARJczsELBOc+9H7uDYnzz/F9T/+FwWqF/ZhXcM+ccrJ0aewjIhTX08MhD8gCux4QL8BrPjRJ13WNdFfFkwEXY8/HpSMEfE4TCPQJYgQ8YUv+GK8Kag1ouDzTxJiEbVQIMBBAjV/WaR8bC6xWQEKwBVLi/P6ZYFEBx4/XKOxfsj7yMX2eFj9chTuekK6OHHqOyz+8mM9pV2YVQ9X6PijPorXB55dJcb+/d87JFzQm8Tv6P3TN/5VNuSoGnckP/ygRxTtHv+XTdsukejJydF/MP/4v5tm1+2cTdZ7X/7Woc6+YJgkCgGGYhtctA88q/OaZCF76AAQ9IBU+GpSze6as1c+bm8io1l9b5vspvq6oDgUS3RNJrS6ruesmHftGIyHKHzRZaRSEOYnU/DYMljSmMQE5lRd4yR1gQ9zPo49LdhOJxYs+iqwIoxckOmIg6IBDYZ9N4FPP+vKFdaMzyMCvI4z6rEOKMCCOlgPUxpALLGhT1SFDRBXiX/P8xNSm4IRfcRaiTao1IhMzNFbVoWgDOK5lyLfmuuj+4YpGRf8VRo67BI7rZOCQFY3CT5pwXVnB6V1Ww0t0AW5fKbEauBEief4yuLdA/gJi0+O3gYWF2h2Cf6gRyyB8lrsyp8glbRbAGtLg5h6DfjpPwX3aI4EDngmMIHHL397cvSs20SFB4YU55LASD+jvyChUOohDNImR78GkX3eBev4UdjUbJBESIudvD3VZPiHB2UuwGvgTDCNdInxv819v8Twv8Z9MEscrCRgx22Tnjtf48ad3DbGyacEDmJO4DIviAde5CEHAdME+MCfDHjk8QBkCIYA/wpANMcM+Y54GjPi3OnLt4ItB+9OPI9ZcaxBbT9uu69cBWdrqOVkzHbfF08M3bIyg72uX1gEcy9Y6h3E5vSN92Ozv2Giy0c3TbTStfG4fd7iXdAaumTcKCuFOW6PlT4ktHBFlpmE5kbObhKXGF9Zr4ssowvmsGhtJeFsU1tYh9zOviyexizsq/CEY5TaVqociNcx27olnsoM6/Yw6MLTBGu6GRJVWMC5GzMnSWA+sLyTzCc0V8sHrE7iEoCyQPsJSxtPMpybYYLYMA9Yw/ESfIT9i176SUYTRovsZWdDnkwyk9BasQMgkziTbGIOVSw/E5jEE81e3kHzQ4md25aPRSu3Rg+WqJombks9F83bGj1MsGz8wBjKtGwki+WGTTxwt2DV1vG3aNBgO+kwm/enWbK7+FswYkA1XIUJZuuueC83WduojeXozPVcFoRE+0EYuKWWagf4UCtq5DIp/choh17SY86B4/m0cSfOYD8KwYEC[... ELLIPSIZATION ...]Wln5+C6E0aVQkYmD2RKsC+7uKuJLQ0ts8OpEGre0jm4ld5sIbR/NeQ0t6QWt5Nhf+E1nwrdHEzHvRgJLo1KUXQlDLprWM0rKZPHxRxXpnXyYoY2sRJs7ax+/hSBRfz8auEwjzlM1yiUW8bAl3QnECIw4LfvHoAY3WUIq8IZVfI5ecRh77lgcs+3xIaJfPja6/4CGKGespiCpUk5DS9VcZ35lOFBwT7DV2bBnkTZp4h+Y60+XaQkmjaNYpPY9HsYC2UWNoDlDPdGWc3FE58Zz89Wyq41zmZ5JQ0FWlfKeRO6krxvUocfmoNXoJRRLHN7gOMaNX++B4RWb9y0tHlAfnZnQgIF4zHWwFL1w+IXj0aFby+2GGWKJTlF9Ah6nnrdrZmMeZy7y5O52sCXTar6UN3n1maAPV5JusEMbs9Zi5VsGOOeV/lqUGK70K5vo6PKAcTGhQvSa/rcToYw7yBfd//1jY/51Fc8y8gjGO1eV5xNye+2WY3235wZkc6cWHvrb40OAFtSUFv8rIYikWG5qWVa3YlL36+WqYAhtDa11S0DPGBYnz0jUg9FrXKPCLqJtFfRbc64Pimd9rUee6UzwXffSrlJW41r+IuioNQ39damv8zHrViARcJj0mjR7Yz7vhocrAXVSfmf6MPjrXgSmcSklQarZS4k6SRnzJiRL9aZLSOLq8jvnhOwrtM8SyDbnCLGxvXuG6mumrzSRktYmZAnVD7lSWmG5SlEDj2siCEki3G1pjecD2t+TmdArUJ2PO2y+wdjNa1t57y5Q12USJGn1U4xvnGOi1xmg0j2MYw/ELQmZ/YG4RyZr/BM3au/4hZO29t75ZsmbSf7K4ma2+dom7R59WnCJpwO+5pCl2P2dJU1HkgqQ9NSRNB5qlpIkP0ywiajo17w8iamq01Wb+7QOkN34VJDsv8bKmdJ6GTAGeKlxP5xSuErEpO4xWPCCcxpmSJYZBh3GM5vONcL4n9/ZSqBhNU33qSy+5Ol3Q0q46qqZ6q6ZyItRlv68p5WAC4uJLZHOgLRrSV/z++Fjrb6TNgbjV9o9MbPpq2zzE1g3nQViLSJlaf5qr9dv5IZ6p1hfd40zW7yp/y9bvT3+h9XsxSU5f/hB3ltSnGMVxrD6CPEMsZtpAsD74RT/aHp91DzTNaEh44oDXPGeUVyzyVc0vtcn4fkWdw5YddghyyBB/2iEzI66JAYkASzTuJSB/0AutL/JOAx2ZaYnzALc+dj0NstbZpYCLlmuCLRbMlYSh38HkCXGOOytIMpUVZkVK8ltL5k0lssHqNZs/XjM1R3QhXPKe6ih5LGdMEHVlga2zleNZW7oCoE/f+N2M6U0HImA8N5Aqy8OattwVPDRvjYzU0GxOB/3FgoNu5Ovm3rhZaPvgUxdrxbygvHBUClW1vrMveqtrWADguvr0A90NxsO6M8e5QPW2p3OdNA15PrK+0bme8/fETcC4xTDshbzD+/9J+3sVd2MAAA==',
}
REMOVED_PATHS = [
    "scripts/department-runtime-test.mjs",
    "src/data/department.js",
    "src/pages/DepartmentWorkspace.jsx",
    "src/pages/DepartmentWorkspaceModernFields.css",
    "src/pages/DepartmentWorkspaceV2.css",
    "src/pages/department/DepartmentIcons.jsx",
    "src/pages/department/DepartmentTeacherDirectory.css",
    "src/pages/department/DepartmentTeacherDirectory.jsx",
    "src/pages/department/DepartmentWorkCenter.jsx",
    "src/pages/department/DepartmentWorkspace.css",
    "src/utils/departmentStore.js",
]
APP_MARKERS = [
    "#/department", "route:department", 'data-route="department"', "data-route='department'",
    "department-workspace", "DepartmentWorkspace", "departmentStore", "bes-department-workspace",
    "department-page", "department-workspace-body", "department-command", ".department-", ".dept-",
]


def write_embedded_files():
    for relative, payload in FILES.items():
        target = ROOT / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(gzip.decompress(base64.b64decode(payload)))


def remove_paths():
    for relative in REMOVED_PATHS:
        target = ROOT / relative
        if target.is_dir():
            shutil.rmtree(target)
        elif target.exists():
            target.unlink()


def replace_text(relative, replacements):
    path = ROOT / relative
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")
    for old, new in replacements:
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")


def clean_javascript():
    replace_text("src/components/Navbar.jsx", [
        ("    department: 'Tổ chuyên môn',\n", ""),
        ("    department: 'Department',\n", ""),
        ("  department: '◎',\n", ""),
        (", department: '#3b4cca'", ""),
    ])
    replace_text("src/components/WindowsPhoneIndicator.jsx", [
        (", department: 'Tổ chuyên môn'", ""),
        (", department: 'Department'", ""),
    ])
    replace_text("src/components/FlatAppIcon.jsx", [
        ('  department: (\n    <>\n      <path d="M20 31h60v51H20V31Z" />\n      <path d="M32 18h36v13H32V18Z" />\n      <path d="M32 45h12v12H32V45ZM56 45h12v12H56V45ZM32 65h12v12H32V65ZM56 65h12v12H56V65Z" />\n    </>\n  ),\n', ""),
        ("  'department-workspace': 'department',\n", ""),
    ])
    replace_text("src/pages/WebApps.jsx", [
        ("  'department-workspace', 'homeroom-hub'", "  'homeroom-hub'"),
        ("    'department-workspace': 'Lịch, hồ sơ, nhiệm vụ tổ.', ", ""),
        ("    'department-workspace': 'Schedules, files and tasks.', ", ""),
        ("  if (item.route === 'department' && item.slug) return getToolPermissionId(item.slug);\n", ""),
    ])
    replace_text("src/data/apps.js", [
        ("Combine schedules, action items, professional activities, approvals and department health in one role-aware dashboard.", "Combine schedules, action items, approvals, resources and homeroom information in one role-aware dashboard."),
        ("Tổng hợp lịch làm việc, việc cần xử lý, hoạt động chuyên môn, phê duyệt và tình hình tổ theo đúng vai trò.", "Tổng hợp lịch làm việc, việc cần xử lý, phê duyệt, học liệu và thông tin chủ nhiệm theo đúng vai trò."),
    ])


def split_commas(tokens):
    chunks, current = [], []
    for token in tokens:
        if getattr(token, "type", None) == "literal" and getattr(token, "value", None) == ",":
            chunks.append(current)
            current = []
        else:
            current.append(token)
    chunks.append(current)
    return chunks


def has_css_marker(text):
    lowered = text.lower()
    return "department" in lowered or "dept-" in lowered


def clean_nested(tokens):
    output = []
    for token in tokens:
        token_type = getattr(token, "type", None)
        if token_type == "function":
            name = getattr(token, "lower_name", getattr(token, "name", "")).lower()
            if name in {"is", "where", "not", "has"}:
                kept = []
                for chunk in split_commas(token.arguments):
                    cleaned = clean_nested(chunk)
                    serialized = tinycss2.serialize(cleaned).strip()
                    if serialized and not has_css_marker(serialized):
                        kept.append(cleaned)
                if not kept:
                    continue
                arguments = []
                for index, chunk in enumerate(kept):
                    if index:
                        arguments.append(tinycss2.ast.LiteralToken(0, 0, ","))
                    arguments.extend(chunk)
                token.arguments = arguments
            else:
                token.arguments = clean_nested(token.arguments)
            output.append(token)
        elif token_type in {"() block", "[] block", "{} block"}:
            token.content = clean_nested(token.content)
            output.append(token)
        else:
            output.append(token)
    return output


def clean_rules(rules):
    result = []
    for rule in rules:
        if rule.type == "comment":
            if has_css_marker(rule.value):
                continue
            result.append(rule)
            continue
        if rule.type == "qualified-rule":
            kept = []
            for chunk in split_commas(rule.prelude):
                cleaned = clean_nested(chunk)
                serialized = tinycss2.serialize(cleaned).strip()
                if serialized and not has_css_marker(serialized):
                    kept.append(cleaned)
            if not kept:
                continue
            prelude = []
            for index, chunk in enumerate(kept):
                if index:
                    prelude.append(tinycss2.ast.LiteralToken(0, 0, ","))
                prelude.extend(chunk)
            rule.prelude = prelude
            result.append(rule)
            continue
        if rule.type == "at-rule":
            keyword = rule.lower_at_keyword
            prelude = tinycss2.serialize(rule.prelude).strip()
            if keyword.endswith("keyframes") and has_css_marker(prelude):
                continue
            if rule.content is not None and keyword in {"media", "supports", "layer", "container", "document", "scope"}:
                inner = tinycss2.parse_rule_list(rule.content, skip_whitespace=False, skip_comments=False)
                rule.content = tinycss2.parse_component_value_list(tinycss2.serialize(clean_rules(inner)))
            result.append(rule)
            continue
        result.append(rule)
    return result


def clean_css():
    styles = ROOT / "src/styles"
    for path in styles.rglob("*.css"):
        text = path.read_text(encoding="utf-8")
        if "department" not in text.lower() and "dept-" not in text.lower():
            continue
        rules = tinycss2.parse_stylesheet(text, skip_whitespace=False, skip_comments=False)
        path.write_text(tinycss2.serialize(clean_rules(rules)), encoding="utf-8")


def remove_historical_app_docs():
    archive = ROOT / "archive"
    if not archive.exists():
        return
    for path in sorted(archive.rglob("*"), key=lambda item: len(item.parts), reverse=True):
        if path.is_file() and ("department" in path.name.lower() or "dept" in path.name.lower()):
            path.unlink()
        elif path.is_dir() and not any(path.iterdir()):
            path.rmdir()


def verify():
    failures = []
    for relative in REMOVED_PATHS:
        if (ROOT / relative).exists():
            failures.append(f"removed path still exists: {relative}")
    scan_roots = [ROOT / "src", ROOT / "package.json"]
    for scan_root in scan_roots:
        files = [scan_root] if scan_root.is_file() else [path for path in scan_root.rglob("*") if path.is_file()]
        for path in files:
            if path.suffix.lower() not in {".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".json", ".css", ".html"} and path.name != "package.json":
                continue
            text = path.read_text(encoding="utf-8", errors="ignore").lower()
            for marker in APP_MARKERS:
                if marker.lower() in text:
                    failures.append(f"{path.relative_to(ROOT)}: {marker}")
    if failures:
        raise SystemExit("Removed-app cleanup failed:\n- " + "\n- ".join(failures))
    print("Removed-app cleanup passed.")


def main():
    write_embedded_files()
    remove_paths()
    clean_javascript()
    clean_css()
    remove_historical_app_docs()
    verify()


if __name__ == "__main__":
    main()
