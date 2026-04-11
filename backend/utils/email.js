const sendOTP = async (email, otp) => {
  console.log(`\n[OTP] Verification code for ${email}: ${otp} (expires in 10 minutes)\n`)
}

module.exports = { sendOTP }