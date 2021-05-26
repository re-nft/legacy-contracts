// import { HardhatRuntimeEnvironment } from "hardhat/types";
// import { DeployFunction } from "hardhat-deploy/types";

// const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
//   const { deployments, getNamedAccounts, ethers } = hre;
//   const { deploy } = deployments;
//   const { lender, deployer, beneficiary } = await getNamedAccounts();

//   const signer = await ethers.getSigner(deployer);
//   const gasPrice = await signer.getGasPrice();

//   await deploy("WETH", {
//     from: deployer,
//     log: true,
//     args: [deployer],
//     gasPrice
//   });

//   await deploy("DAI", {
//     from: deployer,
//     log: true,
//     args: [deployer],
//     gasPrice
//   });

//   await deploy("USDC", {
//     from: deployer,
//     log: true,
//     args: [deployer],
//     gasPrice
//   });

//   await deploy("USDT", {
//     from: deployer,
//     log: true,
//     args: [deployer],
//     gasPrice
//   });

//   await deploy("TUSD", {
//     from: deployer,
//     log: true,
//     args: [deployer],
//     gasPrice
//   });

//   await deploy("E721", {
//     from: deployer,
//     log: true,
//     gasPrice
//   });

//   await deploy("E721B", {
//     from: deployer,
//     log: true,
//     gasPrice
//   });

//   await deploy("E1155", {
//     from: deployer,
//     log: true,
//     args: [deployer, beneficiary, lender],
//     gasPrice
//   });

//   await deploy("E1155B", {
//     from: deployer,
//     log: true,
//     args: [deployer, beneficiary, lender],
//     gasPrice
//   });

//   await deploy("Utils", {
//     from: deployer,
//     log: true,
//     gasPrice
//   });
// };

// export default func;

// func.tags = ["Test"];
