// /* eslint-disable */
// import { HardhatRuntimeEnvironment } from "hardhat/types";
// import { DeployFunction } from "hardhat-deploy/types";
// // ! ignores required because frontend is auto-generated
// // ! and your typescript will not compile on the first run
// import { ERC20 } from "../../frontend/src/hardhat/typechain/ERC20";
// import { E721 } from "../../frontend/src/hardhat/typechain/E721";
// import { E721B } from "../../frontend/src/hardhat/typechain/E721B";
// import { Resolver } from "../../frontend/src/hardhat/typechain/Resolver";

// // TODO: this fails somewhere when deploying to testnets

// /**
//  * Gives everyone a bit of ERC20 test tokens & mints all erc721s
//  * to lender named account, & erc1155s to lender and other top 2
//  * accounts
//  * @param hre
//  */
// const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
//   const { getNamedAccounts, ethers, deployments } = hre;
//   const { lender, deployer, beneficiary, renter } = await getNamedAccounts();
//   const { deploy } = deployments;

//   // const signer = await ethers.getSigner(deployer);

//   await deploy("Resolver", {
//     from: deployer,
//     log: true,
//     args: [deployer]
//   });

//   const resolver = <Resolver>await ethers.getContract("Resolver", deployer);

//   await deploy("ReNFT", {
//     from: deployer,
//     log: true,
//     args: [resolver.address, beneficiary, deployer]
//   });

//   const e721 = <E721>await ethers.getContract("E721", lender);
//   const e721b = <E721B>await ethers.getContract("E721B", lender);

//   Promise.all([Array(10).fill(e721.award()), Array(10).fill(e721b.award())]);

//   // * also send through 100 erc20 tokens to everyone
//   const weth = <ERC20>await ethers.getContract("WETH", deployer);
//   const dai = <ERC20>await ethers.getContract("DAI", deployer);
//   const usdc = <ERC20>await ethers.getContract("USDC", deployer);
//   const usdt = <ERC20>await ethers.getContract("USDT", deployer);
//   const tusd = <ERC20>await ethers.getContract("TUSD", deployer);

//   await resolver.setPaymentToken(1, weth.address);
//   await resolver.setPaymentToken(2, dai.address);
//   await resolver.setPaymentToken(3, usdc.address);
//   await resolver.setPaymentToken(4, usdt.address);
//   await resolver.setPaymentToken(5, tusd.address);

//   console.log("💠 resolver set payment tokens 💠");

//   const amtToSend = ethers.utils.parseEther("100");

//   // have to wait on kovan
//   let txn = await weth.transfer(lender, amtToSend);
//   await txn.wait()
//   console.log("💰 lender received weth");
//   txn = await weth.transfer(beneficiary, amtToSend);
//   await txn.wait();
//   console.log("💰 beneficiary received weth");
//   txn = await weth.transfer(renter, amtToSend);
//   await txn.wait();
//   console.log("💰 renter received weth");

//   txn = await usdt.transfer(lender, amtToSend);
//   await txn.wait();
//   console.log("💰 lender received usdt");
//   txn = await usdt.transfer(beneficiary, amtToSend);
//   await txn.wait();
//   console.log("💰 beneficiary received usdt");
//   txn = await usdt.transfer(renter, amtToSend);
//   await txn.wait();
//   console.log("💰 renter received usdt");

//   txn = await usdc.transfer(lender, amtToSend);
//   await txn.wait();
//   console.log("💰 lender received usdc");
//   txn = await usdc.transfer(beneficiary, amtToSend);
//   await txn.wait();
//   console.log("💰 beneficiary received usdc");
//   txn = await usdc.transfer(renter, amtToSend);
//   await txn.wait();
//   console.log("💰 renter received usdc");

//   txn = await dai.transfer(lender, amtToSend);
//   await txn.wait();
//   console.log("💰 lender received dai");
//   txn = await dai.transfer(beneficiary, amtToSend);
//   await txn.wait();
//   console.log("💰 beneficiary received dai");
//   txn = await dai.transfer(renter, amtToSend);
//   await txn.wait();
//   console.log("💰 renter received dai");

//   txn = await tusd.transfer(lender, amtToSend);
//   await txn.wait()
//   console.log("💰 lender received weth");
//   txn = await tusd.transfer(beneficiary, amtToSend);
//   await txn.wait();
//   console.log("💰 beneficiary received weth");
//   txn = await tusd.transfer(renter, amtToSend);
//   await txn.wait();
//   console.log("💰 renter received weth");
// };

// export default func;

// func.tags = ["Development"];
// func.dependencies = ["Test"];
