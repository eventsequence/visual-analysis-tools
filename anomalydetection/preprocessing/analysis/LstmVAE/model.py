from __future__ import print_function
import numpy as np
import tensorflow as tf
import six
from timeit import default_timer as timer
import random


class LSTM_Var_Autoencoder(object):

    def __init__(self, intermediate_dim=None, z_dim=None, n_dim=None,
                 stateful=False):
        """
        Args:
        intermediate_dim : LSTM cells dimension.
        z_dim : dimension of latent space.
        n_dim : dimension of input data.
        statefull : if true, keep cell state through batches.
        """
        
        if not intermediate_dim or not z_dim or not n_dim:
            raise ValueError("You should set intermediate_dim, z_dim"
                             "(latent space) dimension and your input"
                             "third dimension, n_dim."
                             " \n            ")

        tf.reset_default_graph()

        self.z_dim = z_dim
        self.n_dim = n_dim
        self.intermediate_dim = intermediate_dim
        self.stateful = stateful
        self.x = tf.placeholder(tf.float32, shape=[None, None, self.n_dim])
        self.batch_size = tf.placeholder(tf.int64)
        self.pos_weight = tf.placeholder(tf.float32, self.n_dim)

        self.repeat = tf.placeholder(tf.int32)
        self.kl_weight = 5  # KL weight of loss equation. Recommend 0.5 or 1.0.
        self.kl_weight_start = 0.08  # KL start weight when annealing.
        self.kl_tolerance = 0.4  # Level of KL loss at which to stop optimizing for KL.
        self.kl_decay_rate = 0.99995  # KL annealing decay rate per minibatch.
        self.kl_cof = tf.Variable(self.kl_weight_start, trainable=False)

        def gauss_sampling(mean, sigma):
            with tf.name_scope("sample_gaussian"):
                eps = tf.random_normal(tf.shape(sigma), 0, 1, dtype=tf.float32)
            # It should be log(sigma / 2), but this empirically converges"
            # much better for an unknown reason"
                z = tf.add(mean, tf.exp(sigma/2) * eps)
                return z

    # (with few modifications) from https://stackoverflow.com/questions

        def get_state_variables(batch_size, cell):
            # For each layer, get the initial state and make a variable out of it
            # to enable updating its value.
            state_variables = []
            for state_c, state_h in cell.zero_state(batch_size, tf.float32):
                state_variables.append(tf.nn.rnn_cell.LSTMStateTuple(
                    (state_c), (state_h)))
    # Return as a tuple, so that it can be fed to dynamic_rnn as an initial
    # state
            return tuple(state_variables)

        # Add an operation to update the train states with the last state
        # tensors
        def get_state_update_op(state_variables, new_states):
            update_ops = []
            for state_variable, new_state in zip(state_variables, new_states):
                update_ops.extend([state_variable[0] == new_state[0],
                                   state_variable[1] == new_state[1]])
            return tf.tuple(update_ops)

        # Return an operation to set each variable in a list of LSTMStateTuples
        # to zero
        def get_state_reset_op(state_variables, cell, batch_size):
            zero_states = cell.zero_state(batch_size, tf.float32)
            return get_state_update_op(state_variables, zero_states)

        weights = {
            'z_mean': tf.get_variable(
                "z_mean",
                shape=[
                    self.intermediate_dim,
                    self.z_dim],
                initializer=tf.contrib.layers.xavier_initializer()),
            'log_sigma': tf.get_variable(
                "log_sigma",
                shape=[
                    self.intermediate_dim,
                    self.z_dim],
                initializer=tf.contrib.layers.xavier_initializer())}
        biases = {
            'z_mean_b': tf.get_variable("b_mean", shape=[self.z_dim],
                                        initializer=tf.zeros_initializer()),
            'z_std_b': tf.get_variable("b_log_sigma", shape=[self.z_dim],
                                       initializer=tf.zeros_initializer())
        }

        with tf.variable_scope("encoder"):
            with tf.variable_scope("LSTM_encoder"):
                lstm_layer = tf.nn.rnn_cell.LSTMCell(
                    self.intermediate_dim,
                    forget_bias=1,
                    initializer=tf.contrib.layers.xavier_initializer(),
                    activation=tf.nn.relu)


        outputs, _ = tf.nn.dynamic_rnn(lstm_layer, self.x, dtype="float32")

        # For each layer, get the initial state. states will be a tuple of
        # LSTMStateTuples.
        self.z_mean = tf.add(tf.matmul(
            outputs[:, -1, :], weights['z_mean']), biases['z_mean_b'])
        self.z_log_sigma_sq = tf.add(tf.matmul(
            outputs[:, -1, :], weights['log_sigma']), biases['z_std_b'])
        self.z = gauss_sampling(self.z_mean, self.z_log_sigma_sq)

        # from [batch_size,z_dim] to [batch_size, TIMESTEPS, z_dim]
        repeated_z = tf.keras.layers.RepeatVector(
            self.repeat, dtype="float32")(self.z)

        with tf.variable_scope("decoder"):

            with tf.variable_scope('lstm_decoder_stateless'):
                rnn_layers = [
                    tf.nn.rnn_cell.LSTMCell(
                        size,
                        initializer=tf.contrib.layers.xavier_initializer(),
                        forget_bias=1) for size in [
                        self.intermediate_dim,
                        n_dim]]
                multi_rnn_cell = tf.nn.rnn_cell.MultiRNNCell(rnn_layers)
            self.x_reconstr_mean, _ = tf.nn.dynamic_rnn(cell=multi_rnn_cell, inputs=repeated_z, dtype=tf.float32)
            self.x_reconstr_mean = tf.nn.sigmoid(self.x_reconstr_mean)

    def _create_loss_optimizer(self, opt, **param):
        with tf.name_scope("MSE"):
            # pos_weight = log(total)./log(pos)-1
            # self.test = tf.nn.sigmoid_cross_entropy_with_logits(labels = self.x, logits=self.x_reconstr_mean)
            # self.reconstr_loss = tf.reduce_mean(
            #     tf.nn.weighted_cross_entropy_with_logits(targets=self.x, logits=self.x_reconstr_mean, pos_weight=self.pos_weight))
            self.reconstr_loss = tf.reduce_mean(self.x*-tf.log(self.x_reconstr_mean)*self.pos_weight+(1-self.x)*-tf.log(1-self.x_reconstr_mean))
            # self.reconstr_loss = tf.reduce_mean(tf.nn.sigmoid_cross_entropy_with_logits(labels = self.x, logits=self.x_reconstr_mean))
            # reconstr_loss = tf.reduce_sum(
            #     tf.losses.mean_squared_error(
            #         self.x, self.x_reconstr_mean))/tf.cast(self.repeat, tf.float32)
        with tf.name_scope("KL_divergence"):
            self.latent_loss = -0.5 * tf.reduce_mean(1 + 2 * self.z_log_sigma_sq
                                               - self.z_mean**2
                                               - tf.exp(2 * self.z_log_sigma_sq))

            self.latent_loss = tf.maximum(self.latent_loss, self.kl_tolerance)


        self._cost = self.reconstr_loss + self.kl_cof*self.latent_loss

        # apply gradient clipping
        # tvars = tf.trainable_variables()
        # grads, _ = tf.clip_by_global_norm(tf.gradients(self._cost, tvars), 10)
        # self.train_op = opt(**param).apply_gradients(zip(grads, tvars))
        self.train_op = tf.train.AdamOptimizer().minimize(self._cost)

    def fit(
            self,
            pos_weight,
            length_set,
            sequences,
            learning_rate=0.001,
            batch_size=80,
            num_epochs=100,
            opt=tf.train.AdamOptimizer,
            REG_LAMBDA=0,
            grad_clip_norm=10,
            optimizer_params=None,
            verbose=True):      

        if optimizer_params is None:
            optimizer_params = {}
            optimizer_params['learning_rate'] = learning_rate
        else:
            optimizer_params = dict(six.iteritems(optimizer_params))

        self._create_loss_optimizer(opt, **optimizer_params)
        # lstm_var = tf.get_collection(
        #     tf.GraphKeys.TRAINABLE_VARIABLES,
        #     scope='LSTM_encoder')
        # self._cost += REG_LAMBDA * tf.reduce_mean(tf.nn.l2_loss(lstm_var))

        config = tf.ConfigProto(allow_soft_placement=True)
        config.gpu_options.allow_growth = True

        saver = tf.train.Saver()

        self.sess = tf.Session(config=config)
        init = tf.global_variables_initializer()
        self.sess.run(init)
        # self.sess.run(
        #     self.ite.initializer,
        #     feed_dict={
        #         self.input: X,
        #         self.batch_size: batch_size})


        train_batches = []
        for length, sset in length_set.items():
            sset = list(sset)
            random.shuffle(sset)
            num_products = len(sset)
            num_batches = num_products // batch_size
            for i in range(num_batches + 1):
                end_idx = min((i + 1) * batch_size, num_products)
                new_batch = sset[(i * batch_size):end_idx]
                if len(new_batch) == batch_size:
                    train_batches.append(new_batch)
        random.shuffle(train_batches)
        batches_per_epoch = len(train_batches)

        # random.shuffle(train_set)
        # num_products = len(train_set)
        # num_batches = num_products // batch_size
        # for i in range(num_batches+1):
        #     end_idx = min((i + 1) * batch_size, num_products)
        #     new_batch = train_set[i*batch_size:end_idx]
        #     if len(new_batch) == batch_size:
        #         train_batches.append(new_batch)
        # random.shuffle(train_batches)
        # batches_per_epoch = len(train_batches)

        # for sent_length, product_set in patients.items():
        #     product_set = list(product_set)
        #     random.shuffle(product_set)
        #     num_products = len(product_set)
        #     num_batches = num_products // batch_size
        #     for i in range(num_batches + 1):
        #         end_idx = min((i + 1) * batch_size, num_products)
        #         new_batch = product_set[(i * batch_size):end_idx]
        #         if len(new_batch) == batch_size:
        #             train_batches.append(new_batch)
        # random.shuffle(train_batches)
        # batches_per_epoch = len(train_batches)

        # X = []
        # for batch in train_batches:
        #     temp = []
        #     for p in batch:
        #         temp.append(sequences[p])
        #     X.append(temp)

        print("\n")
        print("Training...")
        print("\n")
        start = timer()

        for epoch in range(num_epochs):
            train_error = 0
            re_error = 0
            la_error = 0

            curr_kl_weight = (self.kl_weight - (self.kl_weight - self.kl_weight_start) *
                              ((self.kl_decay_rate) ** epoch))
            # print(curr_kl_weight)

            for step in range(batches_per_epoch):
                input = np.array(train_batches[step])
                z_mean, z_sq, z, re_mean, loss, re_loss, la_loss, _ = self.sess.run([self.z_mean, self.z_log_sigma_sq, self.z, self.x_reconstr_mean, self._cost, self.reconstr_loss, self.latent_loss, self.train_op], feed_dict={self.pos_weight: pos_weight, self.kl_cof: curr_kl_weight, self.repeat: np.shape(input)[1], self.x: input})

                if la_loss <= self.kl_tolerance:
                    print('yes')
                # print('z_mean')
                # print(z_mean)
                # print('z_sq')
                # print(z_sq)
                # print('z')
                # print(z)
                # print('results')
                # print(re_mean)
                # print('test')
                # print(test)
                train_error += loss
                re_error += re_loss
                la_error += la_loss

            if step == (batches_per_epoch - 1):
                mean_loss = train_error / batches_per_epoch
                mean_re_loss = re_error / batches_per_epoch
                mean_la_loss = la_error/ batches_per_epoch

            if epoch % 1 == 0 & verbose:
                print(
                    "Epoch {:^6} Loss {:0.10f}"  .format(
                        epoch + 1, mean_loss))
                print(
                    "Epoch {:^6} re_Loss {:0.10f}".format(
                        epoch + 1, mean_re_loss))
                print(
                    "Epoch {:^6} la_Loss {:0.10f}".format(
                        epoch + 1, mean_la_loss))

                x_mean = self.sess.run(self.x_reconstr_mean,
                                        feed_dict={self.repeat: np.shape(input)[1], self.x: input})
                # print(x_mean)
            saver.save(self.sess, './bin/model', global_step=epoch)
        end = timer()
        print("\n")
        print("Training time {:0.2f} minutes".format((end - start) / (60)))

    def reconstruct(self, X):

        config = tf.ConfigProto(allow_soft_placement=True)
        config.gpu_options.allow_growth = True

        saver = tf.train.Saver()

        self.sess = tf.Session(config=config)
        save_path = './bin/model-299'
        saver.restore(self.sess, save_path)

        results = []
        errors = []

        for p in X:
            input = np.array([p])
            print(len(input))
            x_rec = self.sess.run(self.x_reconstr_mean,
                                  feed_dict={self.repeat: np.shape(input)[1], self.x: input})
            print(x_rec.shape)
            squared_error = (x_rec - input)**2

            results.append(x_rec[0].tolist())
            errors.append(squared_error)

        return results, errors


    def reduce(self, X):
        config = tf.ConfigProto(allow_soft_placement=True)
        config.gpu_options.allow_growth = True

        saver = tf.train.Saver()

        self.sess = tf.Session(config=config)
        save_path = './bin/model-299'
        saver.restore(self.sess, save_path)
        result = []
        for p in X:
            input = []
            for k in range(10):
                input.append(p)
            input = np.array(input)
            x = self.sess.run(self.z, feed_dict={self.repeat: np.shape(input)[1], self.x: input})
            x = np.mean(x,0)
            result.append(x.tolist())
        return result
