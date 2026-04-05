function parseUserDataFromEmail(email) {
  // Example email: ishaanyadav_23it073@dtu.ac.in
  const usernamePart = email.split('@')[0];
  const parts = usernamePart.split('_');

  const nameStr = parts[0]; // "ishaanyadav"
  const rollNumberStr = parts[1];

  // Simply capitalize the first letter of the entire name string
  const formattedName = nameStr.charAt(0).toUpperCase() + nameStr.slice(1);

  const admissionYear = `20${rollNumberStr.substring(0, 2)}`;
  const branchCode = rollNumberStr.match(/[a-zA-Z]+/)[0].toUpperCase();
  const number = rollNumberStr.match(/\d+$/)[0];
  
  const fullRollNumber = `${rollNumberStr.substring(0, 2)}/${branchCode}/${number}`;

  return {
    fullName: formattedName, // This will be "Ishaanyadav"
    rollNumber: fullRollNumber,
    admissionYear: parseInt(admissionYear),
    branchCode,
  };
}

module.exports = { parseUserDataFromEmail };