import { BigNumber } from "ethers";
import { Event } from "@ethersproject/contracts/lib";
import { ethers, deployments, getNamedAccounts } from "hardhat";

import { expect } from "./chai-setup";
import { ReNFT } from "../frontend/src/hardhat/typechain/ReNFT";
import { Resolver } from "../frontend/src/hardhat/typechain/Resolver";
import { ERC20 } from "../frontend/src/hardhat/typechain/ERC20";
import { E721 } from "../frontend/src/hardhat/typechain/E721";
import { E721B } from "../frontend/src/hardhat/typechain/E721B";
import { E1155 } from "../frontend/src/hardhat/typechain/E1155";
import { E1155B } from "../frontend/src/hardhat/typechain/E1155B";
import { Utils } from "../frontend/src/hardhat/typechain/Utils";

import {
  packPrice,
  getBalance,
  takeFee,
  getEvents,
  advanceTime,
  getLatestBlock,
} from "./utils";

// default values
const MAX_RENT_DURATION = 1; // 1 day
const DAILY_RENT_PRICE = packPrice(2);
const NFT_PRICE = packPrice(3);
const PAYMENT_TOKEN_WETH = 1; // default token is WETH
const PAYMENT_TOKEN_DAI = 2;
const PAYMENT_TOKEN_USDC = 3;
const PAYMENT_TOKEN_USDT = 4;

const SECONDS_IN_A_DAY = 86400;
const DP18 = ethers.utils.parseEther("1");
const ERC20_SEND_AMT = ethers.utils.parseEther("100000000");

type NamedAccount = {
  address: string;
  renft: ReNFT;
  weth: ERC20;
  dai: ERC20;
  usdc: ERC20;
  e721: E721;
  e1155: E1155;
  e721b: E721B;
  e1155b: E1155B;
};

type lendBatchArgs = {
  tokenIds: number[];
  amounts?: number[];
  maxRentDurations?: number[];
  dailyRentPrices?: string[];
  nftPrices?: string[];
  expectedLendingIds?: number[];
};

const setup = deployments.createFixture(async () => {
  await deployments.fixture(["Test", "Development"]);
  // beneficiary is the party that receives the rent fee cuts
  const { deployer, beneficiary, renter, lender } = await getNamedAccounts();
  const signers = await ethers.getSigners();
  const resolver = ((await ethers.getContract(
    "Resolver"
  )) as unknown) as Resolver;
  const weth = ((await ethers.getContract("WETH")) as unknown) as ERC20;
  const dai = ((await ethers.getContract("DAI")) as unknown) as ERC20;
  const usdc = ((await ethers.getContract("USDC")) as unknown) as ERC20;
  const e721 = ((await ethers.getContract(
    "E721"
  )) as unknown) as E721;
  const e721b = ((await ethers.getContract("E721B")) as unknown) as E721B;
  const e1155 = ((await ethers.getContract(
    "E1155"
  )) as unknown) as E1155;
  const e1155b = ((await ethers.getContract("E1155B")) as unknown) as E1155B;
  const utils = ((await ethers.getContract("Utils")) as unknown) as Utils;
  const renft = ((await ethers.getContract("ReNFT")) as unknown) as ReNFT;

  await weth.transfer(renter, ERC20_SEND_AMT);
  await weth.transfer(lender, ERC20_SEND_AMT);
  await dai.transfer(renter, ERC20_SEND_AMT);
  await dai.transfer(lender, ERC20_SEND_AMT);
  await usdc.transfer(renter, ERC20_SEND_AMT);
  await usdc.transfer(lender, ERC20_SEND_AMT);

  const renftRenter = ((await ethers.getContract(
    "ReNFT",
    renter
  )) as unknown) as ReNFT;
  const renftLender = ((await ethers.getContract(
    "ReNFT",
    lender
  )) as unknown) as ReNFT;
  const wethRenter = ((await ethers.getContract(
    "WETH",
    renter
  )) as unknown) as ERC20;
  const wethLender = ((await ethers.getContract(
    "WETH",
    lender
  )) as unknown) as ERC20;
  const daiRenter = ((await ethers.getContract(
    "DAI",
    renter
  )) as unknown) as ERC20;
  const daiLender = ((await ethers.getContract(
    "DAI",
    lender
  )) as unknown) as ERC20;
  const usdcRenter = ((await ethers.getContract(
    "USDC",
    renter
  )) as unknown) as ERC20;
  const usdcLender = ((await ethers.getContract(
    "USDC",
    lender
  )) as unknown) as ERC20;
  const e721Renter = ((await ethers.getContract(
    "E721",
    renter
  )) as unknown) as E721;
  const e721Lender = ((await ethers.getContract(
    "E721",
    lender
  )) as unknown) as E721;
  const e721bRenter = ((await ethers.getContract(
    "E721B",
    renter
  )) as unknown) as E721;
  const e721bLender = ((await ethers.getContract(
    "E721B",
    lender
  )) as unknown) as E721;
  const e1155Renter = ((await ethers.getContract(
    "E1155",
    renter
  )) as unknown) as E1155;
  const e1155Lender = ((await ethers.getContract(
    "E1155",
    lender
  )) as unknown) as E1155;
  const e1155bRenter = ((await ethers.getContract(
    "E1155B",
    renter
  )) as unknown) as E1155;
  const e1155bLender = ((await ethers.getContract(
    "E1155B",
    lender
  )) as unknown) as E1155;

  await wethRenter.approve(renft.address, ethers.constants.MaxUint256);
  await wethLender.approve(renft.address, ethers.constants.MaxUint256);
  await daiRenter.approve(renft.address, ethers.constants.MaxUint256);
  await daiLender.approve(renft.address, ethers.constants.MaxUint256);
  await usdcRenter.approve(renft.address, ethers.constants.MaxUint256);
  await usdcLender.approve(renft.address, ethers.constants.MaxUint256);

  await e721Renter.setApprovalForAll(renft.address, true);
  await e721Lender.setApprovalForAll(renft.address, true);
  await e721bRenter.setApprovalForAll(renft.address, true);
  await e721bLender.setApprovalForAll(renft.address, true);
  await e1155Renter.setApprovalForAll(renft.address, true);
  await e1155Lender.setApprovalForAll(renft.address, true);
  await e1155bRenter.setApprovalForAll(renft.address, true);
  await e1155bLender.setApprovalForAll(renft.address, true);

  for (let i = 0; i < 10; i++) {
    await e721Lender.award();
    await e721bLender.award();
    await e1155Lender.award();
    await e1155bLender.award();
  }
  await e721.setApprovalForAll(renft.address, true);
  await e721b.setApprovalForAll(renft.address, true);
  await e1155.setApprovalForAll(renft.address, true);
  await e1155b.setApprovalForAll(renft.address, true);

  return {
    resolver,
    renft,
    weth,
    dai,
    usdc,
    e721,
    e1155,
    e721b,
    e1155b,
    utils,
    signers,
    deployer,
    beneficiary,
    renter: {
      address: renter,
      weth: wethRenter,
      dai: daiRenter,
      usdc: usdcRenter,
      e721: e721Renter,
      e721b: e721bRenter,
      e1155: e1155Renter,
      e1155b: e1155bRenter,
      renft: renftRenter,
    },
    lender: {
      address: lender,
      weth: wethLender,
      dai: daiLender,
      usdc: usdcRenter,
      e721: e721Lender,
      e721b: e721bLender,
      e1155: e1155Lender,
      e1155b: e1155bLender,
      renft: renftLender,
    },
  };
});

const captureBalances = async (accs: (NamedAccount | ReNFT)[], coins: ERC20[]) => {
  const balances = [];
  for (let i = 0; i < accs.length; i++) {
    for (let j = 0; j < coins.length; j++) {
      balances.push(await coins[j].balanceOf(accs[i].address));
    }
  }
  return balances;
}

describe("ReNFT", function () {
  context("Lending", async function () {
    let renft: ReNFT;
    let usdc: ERC20;
    let e721: E721;
    let e721b: E721B;
    let e1155: E1155;
    let e1155b: E1155B;
    let lender: NamedAccount;

    beforeEach(async () => {
      const o = await setup();
      renft = o.lender.renft;
      usdc = o.lender.usdc;
      e721 = o.lender.e721;
      e721b = o.lender.e721b;
      e1155 = o.lender.e1155;
      e1155b = o.lender.e1155b;
      lender = o.lender;
    });

    const validateEvent = async (
      e: Event["args"],
      {
        nftAddress,
        tokenId,
        lendingId,
        amount,
      }: {
        nftAddress: string;
        tokenId: number;
        lendingId: number;
        amount: number;
      }
    ) => {
      if (!e) throw new Error("No args");
      expect(e.nftAddress).to.eq(nftAddress);
      expect(e.tokenId).to.eq(tokenId);
      expect(e.lendingId).to.eq(lendingId);
      expect(e.lenderAddress).to.eq(lender.address);
      expect(e.maxRentDuration).to.eq(MAX_RENT_DURATION);
      expect(e.dailyRentPrice).to.eq(DAILY_RENT_PRICE);
      expect(e.nftPrice).to.eq(NFT_PRICE);
      expect(e.paymentToken).to.eq(PAYMENT_TOKEN_WETH);

      switch (e.nftAddress.toLowerCase()) {
        case e721.address.toLowerCase():
          expect(await e721.ownerOf(tokenId)).to.eq(renft.address);
          break;
        case e721b.address.toLowerCase():
          expect(await e721b.ownerOf(tokenId)).to.eq(renft.address);
          break;
        case e1155b.address.toLowerCase():
          expect(await e1155b.balanceOf(renft.address, tokenId)).to.eq(amount);
          break;
        case e1155.address.toLowerCase():
          expect(await e1155.balanceOf(renft.address, tokenId)).to.eq(amount);
          break;
        default:
          throw new Error("unknown address");
      }
    };

    const lendBatch = async ({
      tokenIds,
      nftAddresses = Array(tokenIds.length).fill(e721.address),
      amounts = Array(tokenIds.length).fill(1),
      maxRentDurations = Array(tokenIds.length).fill(MAX_RENT_DURATION),
      dailyRentPrices = Array(tokenIds.length).fill(DAILY_RENT_PRICE),
      nftPrices = Array(tokenIds.length).fill(NFT_PRICE),
      expectedLendingIds = tokenIds.map((_, ix) => ix + 1),
    }: lendBatchArgs & {
      nftAddresses?: string[];
    }) => {
      const txn = await renft.lend(
        nftAddresses,
        tokenIds,
        amounts,
        maxRentDurations,
        dailyRentPrices,
        nftPrices,
        Array(tokenIds.length).fill(PAYMENT_TOKEN_WETH)
      );

      const receipt = await txn.wait();
      const e = getEvents(receipt.events ?? [], "Lent");
      expect(e.length).to.eq(tokenIds.length);

      for (let i = 0; i < tokenIds.length; i++) {
        const ev = e[i].args;
        await validateEvent(ev, {
          nftAddress: nftAddresses[i],
          tokenId: tokenIds[i],
          lendingId: expectedLendingIds[i],
          amount: amounts[i],
        });
      }
    };

    it("721", async function () {
      await lendBatch({ tokenIds: [1] });
    });

    it("721b", async function () {
      await lendBatch({ tokenIds: [1], nftAddresses: [e721b.address] });
    });

    it("1155", async function () {
      await lendBatch({
        tokenIds: [1],
        nftAddresses: [e1155.address],
      });
    });

    it("1155:amounts=[2]", async function () {
      await lendBatch({
        // toeknId 1004 is a shield. see Test/E1155.sol
        tokenIds: [1004],
        amounts: [2],
        nftAddresses: [e1155.address],
      });
    });

    it("721 -> 721", async function () {
      await lendBatch({ tokenIds: [1], expectedLendingIds: [1] });
      await lendBatch({ tokenIds: [2], expectedLendingIds: [2] });
    });

    it("1155 -> 1155", async function () {
      await lendBatch({
        tokenIds: [1],
        amounts: [1],
        expectedLendingIds: [1],
        nftAddresses: [e1155.address],
      });
      await lendBatch({
        tokenIds: [2],
        amounts: [1],
        expectedLendingIds: [2],
        nftAddresses: [e1155.address],
      });
    });

    it("721:tokenIds=[1,2]", async function () {
      await lendBatch({ tokenIds: [1, 2] });
    });

    it("1155:tokenIds=[1,2]", async function () {
      await lendBatch({
        tokenIds: [1, 2],
        amounts: [1, 1],
        nftAddresses: [e1155.address, e1155.address],
      });
    });

    it("{721,721B}", async () => {
      await lendBatch({
        tokenIds: [1, 1],
        amounts: [1, 1],
        maxRentDurations: [1, 1],
        expectedLendingIds: [1, 2],
        nftAddresses: [e721.address, e721b.address],
      });
    });

    it("{721B,721}", async () => {
      await lendBatch({
        tokenIds: [1, 1],
        amounts: [1, 1],
        maxRentDurations: [1, 1],
        expectedLendingIds: [1, 2],
        nftAddresses: [e721b.address, e721.address],
      });
    });

    it("{721,1155}", async () => {
      await lendBatch({
        tokenIds: [1, 1],
        amounts: [1, 1],
        maxRentDurations: [1, 1],
        expectedLendingIds: [1, 2],
        nftAddresses: [e721.address, e1155.address],
      });
    });

    it("{1155,721}", async () => {
      await lendBatch({
        tokenIds: [1, 1],
        amounts: [1, 1],
        maxRentDurations: [1, 1],
        expectedLendingIds: [1, 2],
        nftAddresses: [e1155.address, e721.address],
      });
    });

    it("{1155,1155}", async () => {
      await lendBatch({
        tokenIds: [1, 2],
        amounts: [1, 1],
        maxRentDurations: [1, 1],
        expectedLendingIds: [1, 2],
        nftAddresses: [e1155.address, e1155.address],
      });
    });

    it("{1155,1155B}", async () => {
      await lendBatch({
        tokenIds: [1, 1],
        amounts: [1, 1],
        maxRentDurations: [1, 1],
        expectedLendingIds: [1, 2],
        nftAddresses: [e1155.address, e1155b.address],
      });
    });

    it("{721,721,1155}", async () => {
      await lendBatch({
        tokenIds: [1, 2, 1],
        amounts: [1, 1, 1],
        maxRentDurations: [1, 1, 1],
        expectedLendingIds: [1, 2, 3],
        nftAddresses: [e721.address, e721.address, e1155.address],
      });
    });

    it("{721,1155,721}", async () => {
      await lendBatch({
        tokenIds: [1, 1, 2],
        amounts: [1, 1, 1],
        maxRentDurations: [1, 1, 1],
        expectedLendingIds: [1, 2, 3],
        nftAddresses: [e721.address, e1155.address, e721.address],
      });
    });

    it("{721,1155,1155}", async () => {
      await lendBatch({
        tokenIds: [1, 1, 2],
        amounts: [1, 1, 1],
        maxRentDurations: [1, 1, 1],
        expectedLendingIds: [1, 2, 3],
        nftAddresses: [e721.address, e1155.address, e1155.address],
      });
    });

    it("{721,1155,1155B}", async () => {
      await lendBatch({
        tokenIds: [1, 1, 2],
        amounts: [1, 1, 1],
        maxRentDurations: [1, 1, 1],
        expectedLendingIds: [1, 2, 3],
        nftAddresses: [e721.address, e1155.address, e1155b.address],
      });
    });

    it("{721,1155,1155,721}", async () => {
      await lendBatch({
        tokenIds: [1, 1, 2, 2],
        amounts: [1, 1, 1, 1],
        maxRentDurations: [1, 1, 1, 1],
        expectedLendingIds: [1, 2, 3, 4],
        nftAddresses: [e721.address, e1155.address, e1155.address, e721.address],
      });
    });

    it("{721,1155,1155B,721}", async () => {
      await lendBatch({
        tokenIds: [1, 1, 1, 2],
        amounts: [1, 1, 1, 1],
        maxRentDurations: [1, 1, 1, 1],
        expectedLendingIds: [1, 2, 3, 4],
        nftAddresses: [e721.address, e1155.address, e1155b.address, e721.address],
      });
    });

    it("{1155,721,721}", async () => {
      await lendBatch({
        tokenIds: [1, 1, 2],
        amounts: [1, 1, 1],
        maxRentDurations: [1, 1, 1],
        expectedLendingIds: [1, 2, 3],
        nftAddresses: [e1155.address, e721.address, e721.address],
      });
    });

    // todo
    it("reverts on unsupported token type", async () => {
      await expect(lendBatch({ nftAddresses: [usdc.address], tokenIds: [1] })).to
        .be.reverted;
    });

    it("reverts if tries to lend again - 721", async function () {
      const tokenIds = [1];
      await lendBatch({ tokenIds });
      await expect(lendBatch({ tokenIds })).to.be.revertedWith(
        "ERC721: transfer of token that is not own"
      );
    });

    it("reverts if tries to lend again - 1155", async function () {
      const tokenIds = [1];
      await lendBatch({
        tokenIds,
        amounts: [1],
        nftAddresses: [e1155.address],
      });
      // re-lending the same NFT when you have no more amounts will fail
      await expect(
        lendBatch({
          tokenIds,
          amounts: [1],
          nftAddresses: [e1155.address],
        })
      ).to.be.revertedWith("ERC1155: insufficient balance for transfer");
    });

    it("disallows zero day maxRentDuration - 721", async () => {
      const tokenIds = [1];
      await expect(
        lendBatch({ tokenIds, maxRentDurations: [0] })
      ).to.be.revertedWith("must be at least one day lend");
    });

    it("disallows zero day maxRentDuration - 1155", async () => {
      const tokenIds = [1];
      await expect(
        lendBatch({
          tokenIds,
          amounts: [1],
          maxRentDurations: [0],
          nftAddresses: [e1155.address],
        })
      ).to.be.revertedWith("must be at least one day lend");
    });
  });

  context("Price Unpacking", async function () {
    let utils: Utils;

    beforeEach(async () => {
      const o = await setup();
      utils = o.utils;
    });

    it("unpacks valid number", async () => {
      // this is 1.0001 ether
      const price = "0x00010001";
      const unpacked = await utils.unpackPrice(price, DP18);
      expect(unpacked).to.be.equal(ethers.utils.parseEther("1.0001"));
    });

    // we do not allow zeros. If someone passes zero, then we change it
    // to 0.0001 default scale of the coin (10 ** decimals)
    it("reverts on zero price", async () => {
      const price = "0x00000000";
      const unpacked = utils.unpackPrice(price, DP18);
      expect(unpacked).to.be.revertedWith("invalid price");
    });

    // if someone passses max, then we convert to our max
    // which is 9999.9999 default scale of the coin (10 ** decimals)
    it("unpacks max correctly", async () => {
      const price = "0xffffffff";
      const unpacked = await utils.unpackPrice(price, DP18);
      expect(unpacked).to.be.equal(ethers.utils.parseEther("9999.9999"));
    });

    it("unpacks 0.0001 correctly", async () => {
      const price = "0x00000001";
      const unpacked = await utils.unpackPrice(price, DP18);
      expect(unpacked).to.be.equal(ethers.utils.parseEther("0.0001"));
    });

    // this is for different scale tokens. some tokens have 18 dp
    // some have 12 etc. e.g. USDC has 6 decimal places
    it("unpacks DP12 corrctly", async () => {
      const price = "0x00020003";
      const unpacked = await utils.unpackPrice(
        price,
        ethers.utils.parseUnits("1", "szabo")
      );
      expect(unpacked).to.be.equal(ethers.utils.parseUnits("2.0003", "szabo"));
    });

    it("reverts for DP3", async () => {
      const price = "0x00000001";
      const unpacked = utils.unpackPrice(price, "1000");
      expect(unpacked).to.be.revertedWith("invalid scale");
    });

    it("unpacks DP4 correctly", async () => {
      const price = "0x00010001";
      const unpacked = await utils.unpackPrice(price, "10000");
      expect(unpacked).to.be.equal(10001);
    })
  });

  context("Renting", async function () {
    let ReNFT: ReNFT;
    let E721: E721;
    let WETH: ERC20;
    let USDC: ERC20;
    let Utils: Utils;

    let lender: NamedAccount;
    let renter: NamedAccount;

    beforeEach(async () => {
      const o = await setup();
      lender = o.lender;
      renter = o.renter;
      Utils = o.utils;
      ReNFT = renter.renft;
      E721 = renter.e721;
      USDC = renter.usdc;
      WETH = renter.weth;
    });

    const lendBatch = async ({
      tokenIds,
      amounts = Array(tokenIds.length).fill(1),
      paymentTokens,
      maxRentDurations = Array(tokenIds.length).fill(MAX_RENT_DURATION),
      dailyRentPrices = Array(tokenIds.length).fill(DAILY_RENT_PRICE),
      nftPrices = Array(tokenIds.length).fill(NFT_PRICE),
    }: lendBatchArgs & { paymentTokens: number[] }) => {
      await lender.renft.lend(
        Array(tokenIds.length).fill(E721.address),
        tokenIds,
        amounts,
        maxRentDurations,
        dailyRentPrices,
        nftPrices,
        paymentTokens
      );
    };

    const validateRented = ({
      lendingId,
      rentDuration,
      rentedAt,
      events,
    }: {
      lendingId: number[];
      renterAddress: string[];
      rentDuration: number[];
      rentedAt: number[];
      events: Event[];
    }) => {
      const es = getEvents(events, "Rented");
      for (let i = 0; i < es.length; i++) {
        const event = es[i].args;
        if (!event) throw new Error("no args");
        expect(event.lendingId).to.be.equal(lendingId[i]);
        expect(event.rentDuration).to.be.equal(rentDuration[i]);
        expect(event.rentedAt).to.be.equal(rentedAt[i]);
      }
    };

    it("rents ok - WETH", async () => {
      await lendBatch({
        tokenIds: [1],
        paymentTokens: [PAYMENT_TOKEN_WETH],
        maxRentDurations: [3],
      });

      const rentDurations = [2];
      const balancesPre = await captureBalances([renter, ReNFT], [WETH]);

      expect(balancesPre[1]).to.be.equal(0);

      const rentAmounts = BigNumber.from(rentDurations[0]).mul(
        await Utils.unpackPrice(DAILY_RENT_PRICE, DP18)
      );
      const pmtAmount = (await Utils.unpackPrice(NFT_PRICE, DP18)).add(rentAmounts);

      const tx = await ReNFT.rent([E721.address], [1], [1], [1], rentDurations);

      const balancesPost = await captureBalances([renter, ReNFT], [WETH]);
      expect(balancesPost[1]).to.be.equal(pmtAmount);
      expect(balancesPost[0]).to.be.equal(balancesPre[0].sub(pmtAmount));

      const receipt = await tx.wait();

      const rentedAt = [(await getLatestBlock()).timestamp];
      const events = receipt.events ?? [];
      validateRented({
        lendingId: [1],
        renterAddress: [renter.address],
        rentDuration: [2],
        rentedAt,
        events,
      });
    });

    it("rents ok - USDC (DP6)", async () => {
      const tokenIds = [1];
      const rentDurations = [2];
      const maxRentDurations = [10];
      const lentAmounts = [1];
      const paymentTokens = [PAYMENT_TOKEN_USDC];

      await lendBatch({
        tokenIds,
        paymentTokens,
        maxRentDurations,
      });

      const nftAddress = [E721.address];
      const lendingId = [1];
      const scale = BigNumber.from((10 ** (await USDC.decimals())).toString());

      const balancesPre = await captureBalances([renter, ReNFT], [USDC]);
      const pmtAmount = (await Utils.unpackPrice(NFT_PRICE, scale)).add(
        BigNumber.from(rentDurations[0]).mul(await Utils.unpackPrice(DAILY_RENT_PRICE, scale))
      );

      const tx = await ReNFT.rent(
        nftAddress,
        tokenIds,
        lentAmounts,
        lendingId,
        rentDurations
      );

      const receipt = await tx.wait();
      const balancesPost = await captureBalances([renter, ReNFT], [USDC]);

      expect(balancesPost[1]).to.be.equal(pmtAmount);
      expect(balancesPre[0].sub(balancesPost[0])).to.be.equal(pmtAmount);

      const rentedAt = [(await getLatestBlock()).timestamp];
      const events = receipt.events ?? [];
      validateRented({
        lendingId,
        renterAddress: [renter.address],
        rentDuration: rentDurations,
        rentedAt,
        events,
      });
    });

    it("does not rent when insufficient money sent - USDC", async () => {
      const tokenIds = [1];
      await lendBatch({
        tokenIds,
        paymentTokens: [PAYMENT_TOKEN_USDC],
        maxRentDurations: [3],
      });
      const nftAddress = [E721.address];
      const tokenId = [1];
      const lendingId = [1];
      const rentDuration = [2];
      const allRentersBalance = await renter.usdc.balanceOf(renter.address);
      await renter.usdc.transfer(lender.address, allRentersBalance);

      await expect(
        ReNFT.rent(nftAddress, tokenId, [1], lendingId, rentDuration)
      ).to.be.revertedWith("transfer amount exceeds balance");
    });

    it("rents ok - WETH & USDC", async () => {
      const tokenIds = [1, 2];
      const paymentTokens = [1, 3];
      await lendBatch({
        tokenIds,
        paymentTokens,
        maxRentDurations: [10, 5],
      });

      const nftAddress = Array(2).fill(E721.address);
      const lendingId = [1, 2];
      const rentDuration = [1, 1];

      const WETH_SCALE = BigNumber.from((10 ** (await WETH.decimals())).toString());
      const USDC_SCALE = BigNumber.from((10 ** (await USDC.decimals())).toString());

      const pmtAmounts = [
        (await Utils.unpackPrice(NFT_PRICE, WETH_SCALE)).add(
          BigNumber.from(rentDuration[0]).mul(
            await Utils.unpackPrice(DAILY_RENT_PRICE, WETH_SCALE)
          )
        ),
        (await Utils.unpackPrice(NFT_PRICE, USDC_SCALE)).add(
          BigNumber.from(rentDuration[1]).mul(
            await Utils.unpackPrice(DAILY_RENT_PRICE, USDC_SCALE)
          )
        ),
      ];

      // renterWETH, renterUSDC, ReNFTWETH, ReNFTUSDC
      const balancesPre = await captureBalances([renter, ReNFT], [WETH, USDC]);
      const tx = await ReNFT.rent(
        nftAddress,
        tokenIds,
        [1, 1],
        lendingId,
        rentDuration
      );
      const balancesPost = await captureBalances([renter, ReNFT], [WETH, USDC]);
      const receipt = await tx.wait();

      expect(balancesPost[2]).to.be.equal(pmtAmounts[0]);
      expect(balancesPost[3]).to.be.equal(pmtAmounts[1]);
      expect(balancesPre[0].sub(balancesPost[0])).to.be.equal(pmtAmounts[0]);
      expect(balancesPre[1].sub(balancesPost[1])).to.be.equal(pmtAmounts[1]);

      const rentedAt = Array(2).fill((await getLatestBlock()).timestamp);
      const events = receipt.events ?? [];
      validateRented({
        lendingId,
        renterAddress: [renter.address, renter.address],
        rentDuration,
        rentedAt,
        events,
      });
    });

    it("does not rent when insufficient money sent - WETH & USDC - WETH not sufficient", async () => {
      const tokenIds = [1, 2];
      const paymentTokens = [PAYMENT_TOKEN_WETH, PAYMENT_TOKEN_USDC];
      await lendBatch({
        tokenIds,
        paymentTokens,
        maxRentDurations: [10, 5],
      });
      const nftAddress = Array(2).fill(E721.address);
      const lendingId = [1, 2];
      const rentDuration = [2, 5];

      const allRentersBalance = await renter.weth.balanceOf(renter.address);
      await renter.weth.transfer(lender.address, allRentersBalance);

      const tx = ReNFT.rent(
        nftAddress,
        tokenIds,
        [1],
        lendingId,
        rentDuration
      );
      await expect(tx).to.be.revertedWith("transfer amount exceeds balance");
    });

    it("rents ok - WETH & WETH", async () => {
      const tokenIds = [1, 2];
      await lendBatch({
        tokenIds,
        paymentTokens: [PAYMENT_TOKEN_WETH, PAYMENT_TOKEN_WETH],
        maxRentDurations: [3, 2],
      });
      const nftAddress = [E721.address, E721.address];
      const tokenId = [1, 2];
      const lendingId = [1, 2];
      const rentDuration = [2, 1];

      const WETH_SCALE = BigNumber.from((10 ** (await WETH.decimals())).toString());
      // renterWETH, renterUSDC, ReNFTWETH, ReNFTUSDC
      const balancesPre = await captureBalances([renter, ReNFT], [WETH]);

      const pmtAmounts = [
        (await Utils.unpackPrice(NFT_PRICE, WETH_SCALE)).add(
          BigNumber.from(rentDuration[0]).mul(
            await Utils.unpackPrice(DAILY_RENT_PRICE, WETH_SCALE)
          )
        ),
        (await Utils.unpackPrice(NFT_PRICE, WETH_SCALE)).add(
          BigNumber.from(rentDuration[1]).mul(
            await Utils.unpackPrice(DAILY_RENT_PRICE, WETH_SCALE)
          )
        ),
      ];
      const tx = await ReNFT.rent(
        nftAddress,
        tokenId,
        [1, 1],
        lendingId,
        rentDuration
      );
      const balancesPost = await captureBalances([renter, ReNFT], [WETH]);
      const receipt = await tx.wait();

      expect(balancesPost[1]).to.be.equal(pmtAmounts[0].add(pmtAmounts[1]));
      expect(balancesPre[0].sub(balancesPost[0])).to.be.equal(pmtAmounts[0].add(pmtAmounts[1]));

      const rentedAt = Array(2).fill((await getLatestBlock()).timestamp);
      const events = receipt.events ?? [];
      validateRented({
        lendingId,
        renterAddress: [renter.address, renter.address],
        rentDuration,
        rentedAt,
        events,
      });
    });

    it("rents ok - USDC & USDC", async () => {
      const tokenIds = [1, 2];
      await lendBatch({
        tokenIds,
        paymentTokens: [PAYMENT_TOKEN_USDC, PAYMENT_TOKEN_USDC],
        maxRentDurations: [3, 2],
      });
      const nftAddress = [E721.address, E721.address];
      const tokenId = [1, 2];
      const lendingId = [1, 2];
      const rentDuration = [2, 1];

      const USDC_SCALE = BigNumber.from((10 ** (await USDC.decimals())).toString());
      const balancesPre = await captureBalances([renter, ReNFT], [USDC]);

      const pmtAmounts = [
        (await Utils.unpackPrice(NFT_PRICE, USDC_SCALE)).add(
          BigNumber.from(rentDuration[0]).mul(
            await Utils.unpackPrice(DAILY_RENT_PRICE, USDC_SCALE)
          )
        ),
        (await Utils.unpackPrice(NFT_PRICE, USDC_SCALE)).add(
          BigNumber.from(rentDuration[1]).mul(
            await Utils.unpackPrice(DAILY_RENT_PRICE, USDC_SCALE)
          )
        ),
      ];

      const tx = await ReNFT.rent(
        nftAddress,
        tokenId,
        [1, 1],
        lendingId,
        rentDuration
      );
      const balancesPost = await captureBalances([renter, ReNFT], [USDC]);
      const receipt = await tx.wait();

      expect(balancesPost[1]).to.be.equal(pmtAmounts[0].add(pmtAmounts[1]));
      expect(balancesPre[0].sub(balancesPost[0])).to.be.equal(pmtAmounts[0].add(pmtAmounts[1]));

      const rentedAt = Array(2).fill((await getLatestBlock()).timestamp);
      const events = receipt.events ?? [];
      validateRented({
        lendingId,
        renterAddress: [renter.address, renter.address],
        rentDuration,
        rentedAt,
        events,
      });
    });

    it("does not rent - rent duration is zero", async () => {
      const tokenIds = [1];
      const erc20 = 2;
      await lendBatch({
        tokenIds,
        paymentTokens: [erc20],
        maxRentDurations: [3],
      });
      const nftAddress = [E721.address];
      const tokenId = [1];
      const lendingId = [1];
      const rentDuration = [0];
      await expect(
        ReNFT.rent(nftAddress, tokenId, [1], lendingId, rentDuration, {
          value: 0,
        })
      ).to.be.revertedWith("should rent for at least a day");
    });

    it("does not rent - rent duration exceeds max duration", async () => {
      const tokenIds = [1];
      const erc20 = 2;
      await lendBatch({
        tokenIds,
        paymentTokens: [erc20],
        maxRentDurations: [3],
      });
      await expect(
        ReNFT.rent([E721.address], [1], [1], [1], [4], {
          value: 0,
        })
      ).to.be.revertedWith("max rent duration exceeded");
    });

    it("does not rent - already rented", async () => {
      const tokenIds = [1];
      await lendBatch({
        tokenIds,
        paymentTokens: [PAYMENT_TOKEN_WETH],
        maxRentDurations: [3],
      });
      const nftAddress = [E721.address];
      const tokenId = [1];
      const lendingId = [1];
      const rentDuration = [1];
      const pmtAmount = (await Utils.unpackPrice(NFT_PRICE, DP18)).add(
        BigNumber.from(rentDuration[0]).mul(await Utils.unpackPrice(DAILY_RENT_PRICE, DP18))
      );
      ReNFT.rent(nftAddress, tokenId, [1], lendingId, rentDuration, {
        value: pmtAmount,
      });
      await expect(
        ReNFT.rent(nftAddress, tokenId, [1], lendingId, rentDuration, {
          value: pmtAmount,
        })
      ).to.be.revertedWith("renter address is not a zero address");
    });

    it("does not rent - you are lender", async () => {
      const tokenIds = [1];
      const maxRentDurations = 3;
      const _dailyRentPrices = Array(tokenIds.length)
        .fill(DAILY_RENT_PRICE);
      const _nftPrices = Array(tokenIds.length)
        .fill(NFT_PRICE);
      await lender.renft.lend(
        Array(tokenIds.length).fill(E721.address),
        tokenIds,
        Array(tokenIds.length).fill(1),
        [maxRentDurations],
        _dailyRentPrices,
        _nftPrices,
        [PAYMENT_TOKEN_WETH]
      );
      const nftAddress = [E721.address];
      const tokenId = [1];
      const lendingId = [1];
      const rentDuration = [1];
      const pmtAmount = (await Utils.unpackPrice(NFT_PRICE, DP18)).add(
        BigNumber.from(rentDuration[0]).mul(await Utils.unpackPrice(DAILY_RENT_PRICE, DP18))
      );
      await expect(
        lender.renft.rent(nftAddress, tokenId, [1], lendingId, rentDuration, {
          value: pmtAmount,
        })
      ).to.be.revertedWith("cant rent own nft");
    });
  });

  context("Returning", async function () {
    let ReNFT: ReNFT;
    let rentFee: BigNumber;
    let renter: NamedAccount;
    let lender: NamedAccount;
    let USDC: ERC20;
    let Utils: Utils;

    beforeEach(async () => {
      const o = await setup();
      renter = o.renter;
      lender = o.lender;
      Utils = o.utils;
      USDC = o.usdc;
      ReNFT = o.renft;
      rentFee = await renter.renft.rentFee();
    });

    const lendBatch = async ({
      tokenIds,
      paymentTokens,
      maxRentDurations = [],
      dailyRentPrices = [],
      nftPrices = [],
    }: lendBatchArgs & { paymentTokens: number[] }) => {
      let _maxRentDurations = maxRentDurations;
      let _dailyRentPrices = dailyRentPrices;
      let _nftPrices = nftPrices;
      if (maxRentDurations.length === 0) {
        _maxRentDurations = Array(tokenIds.length).fill(MAX_RENT_DURATION);
      }
      if (dailyRentPrices.length === 0) {
        _dailyRentPrices = Array(tokenIds.length).fill(DAILY_RENT_PRICE);
      }
      if (nftPrices.length === 0) {
        _nftPrices = Array(tokenIds.length).fill(NFT_PRICE);
      }
      await lender.renft.lend(
        Array(tokenIds.length).fill(lender.e721.address),
        tokenIds,
        Array(tokenIds.length).fill(1),
        _maxRentDurations,
        _dailyRentPrices,
        _nftPrices,
        paymentTokens
      );
    };

    const validateReturned = ({
      nftAddress,
      tokenId,
      lendingId,
      renterAddress,
      returnedAt,
      events,
    }: {
      nftAddress: string[];
      tokenId: number[];
      lendingId: number[];
      renterAddress: string[];
      returnedAt: number[];
      events: Event[];
    }) => {
      const es = getEvents(events, "Rented");
      for (let i = 0; i < es.length; i++) {
        const event = es[i].args;
        if (!event) throw new Error("no args");
        const {
          nftAddress: _nftAddress,
          tokenId: _tokenId,
          lendingId: _lendingId,
          renterAddress: _renterAddress,
          returnedAt: _returnedAt,
        } = event;
        expect(_nftAddress).to.be.equal(nftAddress[i]);
        expect(_tokenId).to.be.equal(tokenId[i]);
        expect(_lendingId).to.be.equal(lendingId[i]);
        expect(_renterAddress).to.be.equal(renterAddress[i]);
        expect(_returnedAt).to.be.equal(returnedAt[i]);
      }
    };

    it("returns ok - USDC", async () => {
      const rentDuration = 1;
      const drp = 1.6921;
      const col = 0.0001;
      const dailyRentPrice = packPrice(drp);
      const nftPrice = packPrice(col);

      const USDC_SCALE = 10 ** (await USDC.decimals());
      const unpackedDrp = await Utils.unpackPrice(
        dailyRentPrice,
        USDC_SCALE.toString()
      );
      console.log("unpacked drp", unpackedDrp);

      await lendBatch({
        tokenIds: [1],
        paymentTokens: [PAYMENT_TOKEN_USDC],
        maxRentDurations: [1],
        dailyRentPrices: [dailyRentPrice],
        nftPrices: [nftPrice],
      });

      const { beneficiary } = await getNamedAccounts();

      const pmtAmtWoCollateral = BigNumber.from(((rentDuration * drp) * USDC_SCALE).toString())
      const pmtAmtCollateral = await Utils.unpackPrice(nftPrice, BigNumber.from(USDC_SCALE.toString()))

      const balanceBeneficiaryPre = await USDC.balanceOf(beneficiary);
      const balancesPre = await captureBalances([renter, lender, ReNFT], [USDC]);

      let tx = await renter.renft.rent(
        [renter.e721.address],
        [1],
        [1],
        [1],
        [rentDuration]
      );

      let receipt = await tx.wait();
      let es = getEvents(receipt.events ?? [], "Rented");

      // @ts-ignore
      const { rentedAt } = es[0].args;

      const warpTime = 10_000;
      await advanceTime(warpTime);

      tx = await renter.renft.returnIt(
        [renter.e721.address],
        [1],
        [1],
        [1]
      );

      receipt = await tx.wait();
      es = getEvents(receipt.events ?? [], "Returned");

      // @ts-ignore
      const { returnedAt } = es[0].args;

      const actualRentDuration = returnedAt - rentedAt;

      const balanceBeneficiaryPost = await USDC.balanceOf(beneficiary);
      const balancesPost = await captureBalances([renter, lender, ReNFT], [USDC]);

      let sendLenderAmt = pmtAmtWoCollateral
        .mul(actualRentDuration)
        .div(rentDuration * SECONDS_IN_A_DAY)

      const fee = takeFee(sendLenderAmt, rentFee);
      sendLenderAmt = sendLenderAmt.sub(fee);

      const sendRenterAmt = pmtAmtWoCollateral
        .sub(sendLenderAmt)
        .add(pmtAmtCollateral);

      expect(balanceBeneficiaryPost.sub(balanceBeneficiaryPre)).to.be.equal(fee);
      // expect(balancesPost[0].sub(balancesPre[0])).to.be.equal(-sendRenterAmt);
      // expect(balancesPost[1].sub(balancesPre[1])).to.be.equal(sendLenderAmt.add(pmtAmtCollateral));
      // expect(balancesPre[2].sub(balancesPost[2])).to.be.equal(BigNumber.from('0'));




      validateReturned({
        events: receipt.events ?? [],
        nftAddress: [renter.e721.address],
        tokenId: [1],
        lendingId: [1],
        renterAddress: [renter.address],
        returnedAt: [(await getLatestBlock()).timestamp],
      });
    });

    it("returns ok - WETH & USDC", async () => {
      const rentDurations = [2, 4];
      const drpWETH = 1.6921; // acronym for dailry rental price
      const collateralWETH = 0.0001; // denotes collateral
      const drpUSDC = 19.1199;
      const collateralUSDC = 8.1929;
      const dailyRentPriceEth = packPrice(drpWETH);
      const nftPriceWETH = packPrice(collateralWETH);
      const dailyRentPriceErc20 = packPrice(drpUSDC);
      const nftPriceErc20 = packPrice(collateralUSDC);

      await lendBatch({
        amounts: [1, 1],
        tokenIds: [1, 2],
        paymentTokens: [PAYMENT_TOKEN_WETH, PAYMENT_TOKEN_USDC],
        maxRentDurations: [3, 200],
        dailyRentPrices: [dailyRentPriceEth, dailyRentPriceErc20],
        nftPrices: [nftPriceWETH, nftPriceErc20],
      });

      const pmtAmts = [
        ethers.utils.parseEther(
          (rentDurations[0] * drpWETH + collateralWETH).toString()
        ),

          BigNumber.from(((rentDurations[1] * drpUSDC + collateralUSDC) * (10 ** await USDC.decimals())).toString())
        ,
      ];
      const pmtAmtsWoCol = [
        ethers.utils.parseEther((rentDurations[0] * drpWETH).toString()),
        ethers.utils.parseEther((rentDurations[1] * drpUSDC).toString()),
      ];

      await renter.renft.rent(
        [renter.e721.address, renter.e721.address],
        [1, 2],
        [1, 1],
        [1, 2],
        rentDurations,
        {
          value: pmtAmts[0],
        }
      );

      let latestBlock = await getLatestBlock();
      const rentedAt = latestBlock.timestamp;
      await advanceTime(SECONDS_IN_A_DAY + 1969);
      const lenderBalancePreEth = await getBalance(lender.address);
      const renterBalancePreEth = await getBalance(renter.address);
      const lenderBalancePreErc20 = await renter.weth.balanceOf(lender.address);
      const renterBalancePreErc20 = await renter.weth.balanceOf(renter.address);

      const tx = await renter.renft.returnIt(
        [renter.e721.address, renter.e721.address],
        [1, 2],
        [1, 1],
        [1, 2]
      );

      latestBlock = await getLatestBlock();
      const returnedAt = latestBlock.timestamp;
      const _rentDuration = returnedAt - rentedAt;
      const lenderBalancePostEth = await getBalance(lender.address);
      const renterBalancePostEth = await getBalance(renter.address);
      const lenderBalancePostErc20 = await renter.weth.balanceOf(
        lender.address
      );
      const renterBalancePostErc20 = await renter.weth.balanceOf(
        renter.address
      );
      let sendLenderAmtEth = pmtAmtsWoCol[0]
        .mul(_rentDuration)
        .div(rentDurations[0] * SECONDS_IN_A_DAY);
      const sendRenterAmtEth = pmtAmtsWoCol[0]
        .sub(sendLenderAmtEth)
        .add(ethers.utils.parseEther(collateralWETH.toString()));
      let sendLenderAmtErc20 = pmtAmtsWoCol[1]
        .mul(_rentDuration)
        .div(rentDurations[1] * SECONDS_IN_A_DAY);
      const sendRenterAmtErc20 = pmtAmtsWoCol[1]
        .sub(sendLenderAmtErc20)
        .add(ethers.utils.parseEther(collateralUSDC.toString()));
      const feeEth = takeFee(sendLenderAmtEth, rentFee);
      sendLenderAmtEth = sendLenderAmtEth.sub(feeEth);
      const feeErc20 = takeFee(sendLenderAmtErc20, rentFee);
      sendLenderAmtErc20 = sendLenderAmtErc20.sub(feeErc20);
      const receipt = await tx.wait();
      validateReturned({
        events: receipt.events ?? [],
        nftAddress: [renter.e721.address, renter.e721.address],
        tokenId: [1, 2],
        lendingId: [1, 2],
        renterAddress: [renter.address, renter.address],
        returnedAt: Array(2).fill((await getLatestBlock()).timestamp),
      });
      const txGasCost = receipt.gasUsed.mul(tx.gasPrice);
      expect(lenderBalancePostEth.sub(lenderBalancePreEth)).to.be.equal(
        sendLenderAmtEth
      );
      const renterDiffEth = renterBalancePostEth
        .sub(renterBalancePreEth)
        .add(txGasCost);
      expect(sendRenterAmtEth).to.be.equal(renterDiffEth);
      expect(lenderBalancePostErc20.sub(lenderBalancePreErc20)).to.be.equal(
        sendLenderAmtErc20
      );
      const renterDiffErc20 = renterBalancePostErc20.sub(renterBalancePreErc20);
      expect(sendRenterAmtErc20).to.be.equal(renterDiffErc20);
    });
    it("reverts if one of the returned NFTs is past the rent date", async () => {
      const rentDurations = [1, 4];
      const drpEth = 1.9999; // acronym for dailry rental price
      const colEth = 0.1001; // denotes collateral
      const drpErc20 = 0.9199;
      const colErc20 = 8.1929;
      const dailyRentPriceEth = packPrice(drpEth);
      const nftPriceEth = packPrice(colEth);
      const dailyRentPriceErc20 = packPrice(drpErc20);
      const nftPriceErc20 = packPrice(colErc20);
      await lendBatch({
        tokenIds: [1, 2],
        paymentTokens: [1, 2],
        maxRentDurations: [3, 200],
        dailyRentPrices: [dailyRentPriceEth, dailyRentPriceErc20],
        nftPrices: [nftPriceEth, nftPriceErc20],
      });
      // todo: a class like events.args where you can access the members
      // via both the index and the name. In fact, just copy that class
      // into my personal utils file (npm package?)
      const pmtAmts = [
        ethers.utils.parseEther(
          (rentDurations[0] * drpEth + colEth).toString()
        ),
        ethers.utils.parseEther(
          (rentDurations[1] * drpErc20 + colErc20).toString()
        ),
      ];

      await renter.renft.rent(
        [renter.e721.address, renter.e721.address],
        [1, 2],
        [1, 1],
        [1, 2],
        rentDurations,
        {
          value: pmtAmts[0],
        }
      );

      await advanceTime(SECONDS_IN_A_DAY + 100);

      await expect(
        renter.renft.returnIt(
          [renter.e721.address, renter.e721.address],
          [1, 2],
          [1, 1],
          [1, 2]
        )
      ).to.be.revertedWith("");
    });
  });

  context("Collateral Claiming", async function () {
    let renter: NamedAccount;
    let lender: NamedAccount;
    let beneficiary: string;
    let rentFee: BigNumber;

    beforeEach(async () => {
      const o = await setup();
      renter = o.renter;
      lender = o.lender;
      beneficiary = o.beneficiary;
      rentFee = await renter.renft.rentFee();
    });

    const lendBatch = async ({
      tokenIds,
      paymentTokens,
      maxRentDurations = Array(tokenIds.length).fill(MAX_RENT_DURATION),
      dailyRentPrices = Array(tokenIds.length).fill(DAILY_RENT_PRICE),
      nftPrices = Array(tokenIds.length).fill(NFT_PRICE),
    }: lendBatchArgs & { paymentTokens: number[] }) => {
      await lender.renft.lend(
        Array(tokenIds.length).fill(lender.e721.address),
        tokenIds,
        Array(tokenIds.length).fill(1),
        maxRentDurations,
        dailyRentPrices,
        nftPrices,
        paymentTokens
      );
    };

    const validateClaimed = ({
      nftAddress,
      tokenId,
      lendingId,
      claimedAt,
      events,
    }: {
      nftAddress: string[];
      tokenId: number[];
      lendingId: number[];
      claimedAt: number[];
      events: Event[];
    }) => {
      const es = getEvents(events, "Rented");
      for (let i = 0; i < es.length; i++) {
        const event = es[i].args;
        if (!event) throw new Error("no args");
        const {
          nftAddress: _nftAddress,
          tokenId: _tokenId,
          lendingId: _lendingId,
          claimedAt: _claimedAt,
        } = event;
        expect(_nftAddress).to.be.equal(nftAddress[i]);
        expect(_tokenId).to.be.equal(tokenId[i]);
        expect(_lendingId).to.be.equal(lendingId[i]);
        expect(_claimedAt).to.be.equal(claimedAt[i]);
      }
    };

    it("claims collateral ok - one weth one usdc", async () => {
      const tokenIds = [1, 2];
      const paymentTokens = [PAYMENT_TOKEN_WETH, PAYMENT_TOKEN_USDC];
      const maxRentDurations = [10, 101];
      const drpEth = 3.4299;
      const colEth = 23.112;
      const drpErc20 = 9.5982;
      const colErc20 = 1.2135;
      const dailyRentPrices = [packPrice(drpEth), packPrice(drpErc20)];
      const nftPrices = [packPrice(colEth), packPrice(colErc20)];
      await lendBatch({
        tokenIds,
        paymentTokens,
        maxRentDurations,
        dailyRentPrices,
        nftPrices,
      });
      const _nft = Array(2).fill(renter.e721.address);
      const _tokenId = [1, 2];
      const _id = [1, 2];
      const _rentDuration = [1, 4];
      await renter.renft.rent(_nft, _tokenId, [1, 1], _id, _rentDuration);
      await advanceTime(_rentDuration[1] * SECONDS_IN_A_DAY);
      const balancePreWETH = await lender.weth.balanceOf(lender.address);
      const beneficiaryBalancePreWETH = await getBalance(beneficiary);
      const balancePreUSDC = await lender.usdc.balanceOf(lender.address);
      const beneficiaryBalancePreUSDC = await lender.usdc.balanceOf(
        beneficiary
      );
      const tx = await lender.renft.claimCollateral(
        _nft,
        _tokenId,
        [1, 1],
        _id
      );
      const balancePostWETH = await lender.weth.balanceOf(lender.address);
      const balancePostUSDC = await lender.usdc.balanceOf(lender.address);
      const renftBalancePostWETH = await lender.weth.balanceOf(lender.renft.address);
      const receipt = await tx.wait();
      const events = getEvents(receipt.events ?? [], "CollateralClaimed");
      validateClaimed({
        nftAddress: Array(2).fill(lender.e721.address),
        tokenId: tokenIds,
        lendingId: [1, 2],
        claimedAt: Array(2).fill((await getLatestBlock()).timestamp),
        events,
      });
      // ! todo
      // let fullRentPayment = ethers.utils.parseEther(drpEth.toString());
      // const fee = takeFee(fullRentPayment, rentFee);
      // fullRentPayment = fullRentPayment.sub(fee);
      // let fullRentPaymentUSDC = BigNumber.from(_rentDuration[1]).mul(
      //   ethers.utils.parseEther(drpErc20.toString())
      // );
      // const feeUDSC = takeFee(fullRentPaymentErc20, rentFee);
      // fullRentPaymentErc20 = fullRentPaymentErc20.sub(feeErc20);
      // diff = balancePostUSDC.sub(balancePreErc20);
      // expect(diff).to.be.equal(
      //   ethers.utils.parseEther(colErc20.toString()).add(fullRentPaymentUSDC)
      // );
      // const beneficiaryBalanceErc20 = await lender.weth.balanceOf(beneficiary);
      // expect(
      //   beneficiaryBalanceErc20.sub(beneficiaryBalancePreErc20)
      // ).to.be.equal(feeErc20);
    });

    it("claims collalteral ok - one weth", async () => {
      const tokenIds = [1];
      const paymentTokens = [PAYMENT_TOKEN_WETH];
      const maxRentDurations = [7];
      const drp = 6.4299;
      const col = 63.1912;
      const dailyRentPrices = [packPrice(drp)];
      const nftPrices = [packPrice(col)];
      await lendBatch({
        tokenIds,
        paymentTokens,
        maxRentDurations,
        dailyRentPrices,
        nftPrices,
      });
      const _nft = [renter.e721.address];
      const _tokenId = [1];
      const _id = [1];
      const _rentDuration = [1];
      await renter.renft.rent(_nft, _tokenId, [1], _id, _rentDuration);
      await advanceTime(SECONDS_IN_A_DAY + 100);
      const balancePre = await lender.weth.balanceOf(lender.address);
      const beneficiaryBalancePre = await lender.weth.balanceOf(beneficiary);
      const tx = await lender.renft.claimCollateral(_nft, _tokenId, [1], _id);
      const balancePost = await lender.weth.balanceOf(lender.address);
      const renftBalancePost = await lender.weth.balanceOf(
        lender.renft.address
      );
      const receipt = await tx.wait();
      const events = getEvents(receipt.events ?? [], "CollateralClaimed");
      validateClaimed({
        nftAddress: [lender.e721.address],
        tokenId: tokenIds,
        lendingId: [1],
        claimedAt: [(await getLatestBlock()).timestamp],
        events,
      });
      let fullRentPayment = ethers.utils.parseEther(drp.toString());
      const fee = takeFee(fullRentPayment, rentFee);
      fullRentPayment = fullRentPayment.sub(fee);
      const diff = balancePost.sub(balancePre);
      expect(diff).to.be.equal(
        ethers.utils.parseEther(col.toString()).add(fullRentPayment)
      );
      expect(renftBalancePost).to.be.equal(0);
      const beneficiaryBalance = await lender.weth.balanceOf(beneficiary);
      expect(beneficiaryBalance.sub(beneficiaryBalancePre)).to.be.equal(fee);
    });

    it("does not claim collateral if not time", async () => {
      const tokenIds = [1];
      const paymentTokens = [PAYMENT_TOKEN_WETH];
      const maxRentDurations = [7];
      const drp = 6.4299;
      const col = 63.1912;
      const dailyRentPrices = [packPrice(drp)];
      const nftPrices = [packPrice(col)];
      await lendBatch({
        tokenIds,
        paymentTokens,
        maxRentDurations,
        dailyRentPrices,
        nftPrices,
      });
      const _nft = [renter.e721.address];
      const _tokenId = [1];
      const _id = [1];
      const _rentDuration = [1];
      await renter.renft.rent(_nft, _tokenId, [1], _id, _rentDuration);
      await advanceTime(SECONDS_IN_A_DAY - 30);
      await expect(
        lender.renft.claimCollateral(_nft, _tokenId, [1], _id)
      ).to.be.revertedWith("cant claim yet");
    });
  });

  context("Stop Lending", async function () {
    it("stops lending ok", async () => {
      const { lender } = await setup();
      await lender.renft.lend(
        [lender.e721.address],
        [1],
        [1],
        [1],
        [packPrice(1)],
        [packPrice(1)],
        [2]
      );
      expect(await lender.e721.ownerOf(1)).to.be.equal(lender.renft.address);
      const tx = await lender.renft.stopLending(
        [lender.e721.address],
        [1],
        [1],
        [1]
      );
      const receipt = await tx.wait();
      const events = getEvents(receipt.events ?? [], "LendingStopped");
      const event = events[0];
      if (!event.args) throw new Error("LendingStopped not emitted");
      const { lendingId, stoppedAt } = event.args;
      expect(lendingId).to.be.equal(1);
      expect(stoppedAt).to.be.equal((await getLatestBlock()).timestamp);
      expect(await lender.e721.ownerOf(1)).to.be.equal(lender.address);
    });

    it("does not stop lending when currently rented", async () => {
      const { lender, renter } = await setup();
      await lender.renft.lend(
        [lender.e721.address],
        [1],
        [1],
        [1],
        [packPrice(1)],
        [packPrice(1)],
        [2]
      );
      await renter.renft.rent([lender.e721.address], [1], [1], [1], [1]);
      await expect(
        lender.renft.stopLending([lender.e721.address], [1], [1], [1])
      ).to.be.revertedWith("renter address is not a zero address");
    });
  });

  context("Integration", async function () {
    it("relends ok", async () => {
      const { lender, renter } = await setup();
      const nft = [lender.e721.address];
      const paymentToken = [2];
      const tokenId = [1];
      const maxRentDuration = [1];
      const lendingId = [1];
      const dailyRentPrice = [packPrice(1)];
      const collateralPrice = [packPrice(1)];
      await lender.renft.lend(
        nft,
        tokenId,
        [1],
        maxRentDuration,
        dailyRentPrice,
        collateralPrice,
        paymentToken
      );
      await renter.renft.rent(nft, tokenId, [1], lendingId, [1]);
      await renter.renft.lend(
        nft,
        tokenId,
        [1],
        maxRentDuration,
        dailyRentPrice,
        collateralPrice,
        paymentToken
      );
    });

    it("reverts when a mad lend sends an NFT directly", async () => {
      false;
    });

    it("reverts when a mad lad sends us ERC20", async () => {
      false;
    });

    it("reverts when a mad lad sends us ether", async () => {
      false;
    });

    it("reverts when a mad lad sends us ERC20 and ether", async () => {
      false;
    });

    // it('A lends, B rents, B lends, C rents, C defaults', async () => {});

    // it('relends 10 times ok', async () => {});
  });

  context("Admin", async () => {
    it("sets the rentFee", async () => {
      const { deployer } = await setup();
      const deployerRenft = ((await ethers.getContract(
        "ReNFT",
        deployer
      )) as unknown) as ReNFT;
      await deployerRenft.setRentFee("559");
      const rentFee = await deployerRenft.rentFee();
      expect(rentFee).to.be.equal("559");
    });
    it("disallows non deployer to set the rentFee", async () => {
      const { renter } = await setup();
      await expect(renter.renft.setRentFee("559")).to.be.revertedWith("");
    });
    it("disallows to set the fee that exceeds 100", async () => {
      const { deployer } = await setup();
      const deployerRenft = ((await ethers.getContract(
        "ReNFT",
        deployer
      )) as unknown) as ReNFT;
      await expect(deployerRenft.setRentFee("123456789")).to.be.revertedWith(
        ""
      );
    });
    it("sets the beneficiary", async () => {
      const { deployer, signers } = await setup();
      const deployerRenft = ((await ethers.getContract(
        "ReNFT",
        deployer
      )) as unknown) as ReNFT;
      await deployerRenft.setBeneficiary(signers[4].address);
    });
    it("disallows non deployer to set the beneficiary", async () => {
      const { renter, signers } = await setup();
      await expect(
        renter.renft.setBeneficiary(signers[4].address)
      ).to.be.revertedWith("");
    });
  });

  context("Misc", async () => {
    it("makes whole 9999 when exceeds", async () => {
      const { lender, deployer, renter } = await setup();
      await lender.renft.lend(
        [lender.e721.address],
        [1],
        [1],
        [1],
        ["0xffff0000"],
        ["0x0000ffff"],
        [2]
      );
      const dai = ((await ethers.getContract(
        "DAI",
        deployer
      )) as unknown) as ERC20;
      await dai.transfer(renter.address, ethers.utils.parseEther("11000"));
      const renterBalancePre = await dai.balanceOf(renter.address);
      await renter.renft.rent([renter.e721.address], [1], [1], [1], [1]);
      const renterBalancePost = await dai.balanceOf(renter.address);
      const diff = renterBalancePre.sub(renterBalancePost);
      expect(diff).to.be.equal(
        ethers.utils.parseEther("9999").add(ethers.utils.parseEther("0.9999"))
      );
    });

    it("100% test coverage", async () => {
      const { lender, deployer, renter } = await setup();
      await lender.renft.lend(
        [lender.e721.address],
        [1],
        [1],
        [1],
        ["0x00000001"],
        ["0x00000001"],
        [2]
      );
      const dai = ((await ethers.getContract(
        "DAI",
        deployer
      )) as unknown) as ERC20;
      await dai.transfer(renter.address, ethers.utils.parseEther("11000"));
      const renterBalancePre = await dai.balanceOf(renter.address);
      await renter.renft.rent([renter.e721.address], [1], [1], [1], [1]);
      const renterBalancePost = await dai.balanceOf(renter.address);
      const diff = renterBalancePre.sub(renterBalancePost);
      expect(diff).to.be.equal(
        ethers.utils.parseEther("0.0001").add(ethers.utils.parseEther("0.0001"))
      );
    });
  });
});
