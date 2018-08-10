export function handleCLIResult(promise: Promise<any>): void {
  promise
    .then(data => {
      console.log(data);
      process.exit(0);
    })
    .catch(err => {
      console.error(err);
    });
}
