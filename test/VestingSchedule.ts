import { expect } from "chai";
import { ethers } from "hardhat";
import { time, loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("VestingScheduleContract", function () {
    const initialTokenSupply = ethers.parseUnits("100000000", 18);
    const vestingAmount = ethers.parseUnits("1000", 18);
    const durationMonths = 12; // Duration in months

    // Define a fixture to deploy and setup contracts
    async function deployVestingScheduleFixture() {
       
        const [deployer, beneficiary] = await ethers.getSigners();

        // Deploy ERC20 token
        const Token = await ethers.getContractFactory("ERC20Mock");
        const token = await Token.deploy("TestToken", "TTK", initialTokenSupply);

        // Deploy VestingScheduleContract
        const VestingScheduleContract = await ethers.getContractFactory("VestingScheduleContract");
        const vestingScheduleContract = await VestingScheduleContract.deploy(await token.getAddress());

    
        return {
            token,
            vestingScheduleContract,
            vestingAmount,
            deployer,
            beneficiary,
            durationMonths,
        };
    }

    describe("Deployment", function () {
        it("Should deploy contracts correctly", async function () {
            const { token, vestingScheduleContract } = await loadFixture(deployVestingScheduleFixture);
            expect(await token.name()).to.be.equal("TestToken");
        });

        it("Should set the token address correctly", async function () {
            const { vestingScheduleContract, token } = await loadFixture(deployVestingScheduleFixture);
            let tokenAddress = await vestingScheduleContract.token()
            expect(tokenAddress).to.equal(await token.getAddress());
        });
    });

    describe("Vesting Schedule Creation", function () {
        it("Should create a vesting schedule correctly", async function () {
            const { vestingScheduleContract, token, vestingAmount, beneficiary, durationMonths } = await loadFixture(deployVestingScheduleFixture);
            const startTime = (await time.latest()) + 3600; // start in 1 hour
           await token.approve(await vestingScheduleContract.getAddress(),vestingAmount)
            await expect(vestingScheduleContract.createVestingSchedule(
                beneficiary.address,
                startTime,
                durationMonths,
                2, // Duration units: Months
                vestingAmount
            ))
                .to.emit(vestingScheduleContract, "VestingScheduleCreated")
                .withArgs(
                    beneficiary.address,
                    startTime,
                    durationMonths,
                    2,
                    vestingAmount
                );
            const schedule = await vestingScheduleContract.vestingSchedules(beneficiary.address,0);
            expect(schedule.amountTotal).to.equal(vestingAmount);
        });
    });
    describe("Token Release", function () {
        it("Should release tokens according to the vesting schedule", async function () {
            const { vestingScheduleContract, token, vestingAmount, beneficiary, durationMonths } = await loadFixture(deployVestingScheduleFixture);
            const startTime = (await time.latest()) + 3600; // start in 1 hour
            await token.approve(await vestingScheduleContract.getAddress(),vestingAmount)

            await vestingScheduleContract.createVestingSchedule(
                beneficiary.address,
                startTime,
                durationMonths,
                2, // Duration units: Months
                vestingAmount
            );

            // Fast forward time
            await time.increaseTo(startTime + 30 * 24 * 60 * 60); // advance 30 days

            const initialBeneficiaryBalance = await token.balanceOf(beneficiary.address);
            await vestingScheduleContract.connect(beneficiary).release(beneficiary.address);

            const newBeneficiaryBalance = await token.balanceOf(beneficiary.address);
            expect(newBeneficiaryBalance- initialBeneficiaryBalance).to.be.gt(0);
        });

        it("Should correctly calculate the releasable amount", async function () {
            const { vestingScheduleContract, token, vestingAmount, beneficiary, durationMonths } = await loadFixture(deployVestingScheduleFixture);
            const startTime = (await time.latest()) + 3600; // start in 1 hour
            await token.approve(await vestingScheduleContract.getAddress(),vestingAmount)

            await vestingScheduleContract.createVestingSchedule(
                beneficiary.address,
                startTime,
                durationMonths,
                2, // Duration units: Months
                vestingAmount
            );

            // Fast forward time
            await time.increaseTo(startTime + 30 * 24 * 60 * 60); // advance 30 days

            const releasableAmount = await vestingScheduleContract.getReleaseableAmount(beneficiary.address);
            expect(releasableAmount).to.be.gt(0);
        });
    });

  
     
});
