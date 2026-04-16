const cron = require('node-cron');
const User = require('../models/user');
const TestSeries = require('../models/testSeries');
const { sendIncompleteReminderEmail } = require('../config/emailService');

// Schedule tasks to be run on the server
const initCronJobs = () => {
  // Run everyday at 10:00 AM
  cron.schedule('0 10 * * *', async () => {
    console.log('Running daily cron job for incomplete tests...');
    try {
      const users = await User.find({ role: 'student' });
      for (const user of users) {
        if (user.purchasedTests && user.purchasedTests.length > 0) {
          for (const pt of user.purchasedTests) {
            // Check if test is initiated but not completed and hasn't expired
            if (!pt.isCompleted && pt.draftAnswers && pt.draftAnswers.length > 0 && new Date() < new Date(pt.expiresAt)) {
              const testDoc = await TestSeries.findById(pt.testId);
              if (testDoc) {
                await sendIncompleteReminderEmail(user, testDoc.title);
              }
            }
          }
        }
      }
      console.log('Daily cron job for incomplete tests finished.');
    } catch (err) {
      console.error('Error running cron job:', err);
    }
  });
};

module.exports = initCronJobs;
