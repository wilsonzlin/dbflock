export const handleCLIResult = (promise: Promise<any>): void => {
  promise.then(
    (data) => {
      console.log(data);
      process.exit(0);
    },
    (err) => {
      console.error(err);
      process.exit(1);
    }
  );
};
